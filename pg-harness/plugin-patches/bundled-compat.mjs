import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const AT_FILE_MARKER = '// PureGamma at-file settings compatibility v1'
const MAGICPATH_MARKER = '// PureGamma MagicPath tool schema compatibility v1'
const BILLION_MARKER = '// PureGamma billion-context fetch compatibility v1'

function replaceOnce(source, before, after, plugin) {
  const at = source.indexOf(before)
  if (at < 0 || source.indexOf(before, at + before.length) >= 0) {
    throw new Error(plugin + ': expected exactly one compatibility patch anchor: ' + before.slice(0, 75))
  }
  return source.slice(0, at) + after + source.slice(at + before.length)
}

/** Supply local durable settings now that the host no longer exposes settings.register(). */
export function patchAtFile(source) {
  if (source.includes(AT_FILE_MARKER)) return source
  const old = 'function registerAtFileSettings(ctx) {\n  return ctx.settings.register(AT_FILE_NAMESPACE, AtFileSettingsSchema, { applies: "live" });\n}'
  const implementation = [
    'function registerAtFileSettings(ctx) {',
    '  const file = pgJoin(process.env.DSH_HOME || pgJoin(pgHome(), ".dsh"), "pg-harness-state", "dsh-at-file.json");',
    '  const read = () => {',
    '    if (!pgExists(file)) return AtFileSettingsSchema({});',
    '    return AtFileSettingsSchema(JSON.parse(pgRead(file, "utf8")));',
    '  };',
    '  let state = read();',
    '  return {',
    '    get: () => state,',
    '    async update(patch) {',
    '      const next = AtFileSettingsSchema({ ...state, ...patch });',
    '      pgMkdir(pgDirname(file), { recursive: true, mode: 0o700 });',
    '      const pending = file + "." + process.pid + ".pg-pending";',
    '      try {',
    '        pgWrite(pending, JSON.stringify(next, null, 2) + "\\n", { mode: 0o600, flag: "wx" });',
    '        pgRename(pending, file);',
    '      } catch (error) {',
    '        try { pgUnlink(pending); } catch { /* No temporary file on an early write error. */ }',
    '        throw error;',
    '      }',
    '      state = next;',
    '    }',
    '  };',
    '}',
  ].join('\n')
  const imports = [
    'import { existsSync as pgExists, readFileSync as pgRead, mkdirSync as pgMkdir, writeFileSync as pgWrite, renameSync as pgRename, unlinkSync as pgUnlink } from "node:fs";',
    'import { join as pgJoin, dirname as pgDirname } from "node:path";',
    'import { homedir as pgHome } from "node:os";',
    AT_FILE_MARKER,
  ].join('\n') + '\n'
  return imports + replaceOnce(source, old, implementation, 'dsh-at-file')
}

/** Declare only supported raw JSON Schema keywords while preserving CLI flags and arbitrary JSON results. */
export function patchMagicPath(source) {
  if (source.includes(MAGICPATH_MARKER)) return source
  const changes = [
    ["additionalProperties: { type: ['string', 'number', 'boolean'] },", 'additionalProperties: true,'],
    ["exitCode: { type: ['integer', 'null'] },", "exitCode: { oneOf: [{ type: 'integer' }, { type: 'null' }] },"],
    ["data: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },", 'data: {},'],
    ["error: { type: ['string', 'null'] },", "error: { oneOf: [{ type: 'string' }, { type: 'null' }] },"],
    ["hint: { type: ['string', 'null'] },", "hint: { oneOf: [{ type: 'string' }, { type: 'null' }] },"],
    ["authUrl: { type: ['string', 'null'] },", "authUrl: { oneOf: [{ type: 'string' }, { type: 'null' }] },"],
  ]
  for (const [before, after] of changes) source = replaceOnce(source, before, after, 'dsh-magicpath')
  const before = '      const argv = buildArgv({ command, args: args?.args, flags: args?.flags, json: args?.json })'
  const after = [
    '      if (args?.flags !== undefined && (typeof args.flags !== "object" || args.flags === null || Array.isArray(args.flags) ||',
    '          Object.values(args.flags).some(value => !["string", "number", "boolean"].includes(typeof value)))) {',
    '        throw new TypeError("magicpath: flags must contain only string, number or boolean values.")',
    '      }',
    before,
  ].join('\n')
  source = replaceOnce(source, before, after, 'dsh-magicpath')
  return MAGICPATH_MARKER + '\n' + source
}

/** Prefer direct fetch wrapping over a global accessor; explicit opt-in keeps the upstream re-arm mode. */
export function patchBillionContext(source) {
  if (source.includes(BILLION_MARKER)) return source
  const before = 'function shouldReclaimFetchPatch(){const raw=process.env.BILI_RECLAIM_FETCH_PATCH;if(raw===void 0)return true;'
  const after = 'function shouldReclaimFetchPatch(){const raw=process.env.BILI_RECLAIM_FETCH_PATCH;if(raw===void 0)return false;'
  source = replaceOnce(source, before, after, 'billion-context')
  return BILLION_MARKER + '\n' + source
}

const PATCHES = [
  { name: 'dsh-at-file', version: '0.7.0', path: 'lib/index.js', backup: 'dsh-at-file-index.js', patch: patchAtFile },
  { name: 'dsh-magicpath', version: '0.1.0', path: 'lib/index.js', backup: 'dsh-magicpath-index.js', patch: patchMagicPath },
  { name: 'billion-context', version: '0.1.190', path: 'dist/agent/dsh-native.js', backup: 'billion-context-dsh-native.js', patch: patchBillionContext },
]

/** Apply reversible, idempotent fixes only to the three known bundled versions. */
export function installBundledPluginCompatibility(profile, backup) {
  const changed = []
  for (const spec of PATCHES) {
    const root = join(profile, 'node_modules', spec.name)
    const manifest = join(root, 'package.json')
    if (!existsSync(manifest) || JSON.parse(readFileSync(manifest, 'utf8')).version !== spec.version) continue
    const path = join(root, ...spec.path.split('/'))
    if (!existsSync(path)) throw new Error(spec.name + ': expected bundled entry point not found: ' + spec.path)
    const previous = readFileSync(path, 'utf8')
    const next = spec.patch(previous)
    if (next === previous) continue
    mkdirSync(backup, { recursive: true, mode: 0o700 })
    cpSync(path, join(backup, spec.backup))
    const pending = path + '.pg-pending'
    writeFileSync(pending, next)
    renameSync(pending, path)
    changed.push(spec.name)
  }
  return changed
}
