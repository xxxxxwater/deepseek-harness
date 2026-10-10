import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'
import {
  patchAtFile, patchMagicPath, patchBillionContext, installBundledPluginCompatibility,
} from './bundled-compat.mjs'

function archiveContent(name, path) {
  return execFileSync('tar', ['-xOf', new URL('../bundled-plugins/' + name, import.meta.url).pathname, 'package/' + path],
    { maxBuffer: 32 * 1024 * 1024 }).toString()
}

const cases = [
  { name: 'dsh-at-file', version: '0.7.0', tar: 'dsh-at-file-0.7.0.tgz', path: 'lib/index.js', patch: patchAtFile },
  { name: 'dsh-magicpath', version: '0.1.0', tar: 'dsh-magicpath-0.1.0.tgz', path: 'lib/index.js', patch: patchMagicPath },
  { name: 'billion-context', version: '0.1.190', tar: 'billion-context-0.1.190.tgz', path: 'dist/agent/dsh-native.js', patch: patchBillionContext },
]

test('patches target shipped plugins, preserve program entry points and remain idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pg-plugin-syntax-'))
  try {
    for (const spec of cases) {
      const original = archiveContent(spec.tar, spec.path)
      const fixed = spec.patch(original)
      assert.notEqual(fixed, original, spec.name + ' should need a compatibility repair')
      assert.equal(spec.patch(fixed), fixed)
      const path = join(dir, spec.name + '.mjs')
      writeFileSync(path, fixed)
      execFileSync(process.execPath, ['--check', path])
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('at-file keeps live remote settings writes and persists valid values without the removed API', () => {
  const original = archiveContent(cases[0].tar, cases[0].path)
  const fixed = patchAtFile(original)
  assert.ok(!fixed.includes('ctx.settings.register(AT_FILE_NAMESPACE'))
  assert.ok(fixed.includes('new AtFileRuntime(ctx, resolved, readSettings, writeSettings)'))
  assert.ok(fixed.includes('normalizeWorkspaceIgnoreFiles(update.value)'))
  const body = fixed.match(/function registerAtFileSettings\(ctx\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(body)
  const home = mkdtempSync(join(tmpdir(), 'pg-at-file-settings-'))
  try {
    const context = {
      pgJoin: join, pgHome: homedir, pgExists: existsSync, pgRead: readFileSync,
      pgMkdir: mkdirSync, pgWrite: writeFileSync, pgRename: renameSync,
      pgUnlink: unlinkSync, pgDirname: dirname,
      process: { env: { DSH_HOME: home }, pid: process.pid },
      JSON,
      AtFileSettingsSchema: value => ({
        enabled: true,
        ignoreFiles: ['.DS_Store'],
        workspaceIgnoreFiles: [],
        ignorePastedMentions: true,
        ...value,
      }),
    }
    const create = runInNewContext(body + '\nregisterAtFileSettings', context)
    const instance = create({})
    assert.equal(instance.get().enabled, true)
    return instance.update({ enabled: false, workspaceIgnoreFiles: [{ workspace: '/repo', ignoreFiles: ['secret.txt'] }] }).then(() => {
      const again = create({})
      assert.equal(again.get().enabled, false)
      assert.equal(again.get().workspaceIgnoreFiles[0].workspace, '/repo')
      const disk = JSON.parse(readFileSync(join(home, 'pg-harness-state', 'dsh-at-file.json'), 'utf8'))
      assert.equal(disk.enabled, false)
    }).finally(() => rmSync(home, { recursive: true, force: true }))
  } catch (error) {
    rmSync(home, { recursive: true, force: true })
    throw error
  }
})

test('magicpath tool registers a validator-compatible output while preserving CLI commands', async () => {
  const original = archiveContent(cases[1].tar, cases[1].path)
  const fixed = patchMagicPath(original)
  const dir = mkdtempSync(join(tmpdir(), 'pg-magicpath-'))
  try {
    mkdirSync(join(dir, 'lib'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}')
    writeFileSync(join(dir, 'lib', 'index.js'), fixed)
    writeFileSync(join(dir, 'lib', 'cli.js'), archiveContent(cases[1].tar, 'lib/cli.js'))
    const plugin = await import(pathToFileURL(join(dir, 'lib', 'index.js')).href)
    const registered = []
    plugin.apply({ tools: { register: tool => { registered.push(tool); return () => {} } } })
    assert.equal(registered.length, 1)
    const tool = registered[0]
    assert.equal(tool.name, 'magicpath')
    assert.equal(tool.parameters.properties.flags.additionalProperties, true)
    for (const entry of Object.values(tool.output.schema.properties)) {
      assert.equal(Array.isArray(entry.type), false)
    }
    assert.deepEqual(tool.output.schema.properties.data, {})
    const rendered = tool.output.render({}, {
      ok: true, command: 'info', argv: ['info'], exitCode: 0, data: { status: 'ok' },
      stdout: '', stderr: '', error: null, hint: null, authUrl: null,
    })
    assert.equal(rendered[0].type, 'text')
    await assert.rejects(() => tool.execute({ command: 'info', flags: { invalid: [] } }, {}),
      /flags must contain only/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('billion-context direct fetch wrapper is the safe default; upstream opt-in stays available', () => {
  const original = archiveContent(cases[2].tar, cases[2].path)
  const fixed = patchBillionContext(original)
  const fn = fixed.match(/function shouldReclaimFetchPatch\(\)\{[^}]+\}/)?.[0]
  assert.ok(fn)
  const check = value => runInNewContext(fn + ';shouldReclaimFetchPatch()', {
    process: { env: value === undefined ? {} : { BILI_RECLAIM_FETCH_PATCH: value } },
  })
  assert.equal(check(undefined), false)
  assert.equal(check('1'), true)
  assert.equal(check('0'), false)
  assert.ok(fixed.includes('function installFetchChain(makeDispatch)'))
})

test('installation backs up originals once and never patches different versions', () => {
  const home = mkdtempSync(join(tmpdir(), 'pg-plugin-patches-'))
  try {
    const profile = join(home, 'profile')
    const backup = join(home, 'backup')
    for (const spec of cases) {
      const root = join(profile, 'node_modules', spec.name)
      const file = join(root, spec.path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(join(root, 'package.json'), JSON.stringify({ version: spec.version }))
      writeFileSync(file, archiveContent(spec.tar, spec.path))
    }
    assert.deepEqual(installBundledPluginCompatibility(profile, backup), cases.map(x => x.name))
    assert.deepEqual(installBundledPluginCompatibility(profile, backup), [])
    for (const spec of cases) {
      const root = join(profile, 'node_modules', spec.name)
      assert.equal(readFileSync(join(root, spec.path), 'utf8'),
        spec.patch(archiveContent(spec.tar, spec.path)))
      writeFileSync(join(root, 'package.json'), '{"version":"999.0.0"}')
      writeFileSync(join(root, spec.path), 'user owned version')
    }
    assert.deepEqual(installBundledPluginCompatibility(profile, backup), [])
    for (const spec of cases) {
      assert.equal(readFileSync(join(profile, 'node_modules', spec.name, spec.path), 'utf8'), 'user owned version')
    }
    assert.equal(archiveContent(cases[0].tar, cases[0].path).includes('settings.register'), true)
    assert.throws(() => patchAtFile('unexpected code'), /patch anchor/)
    assert.throws(() => patchMagicPath('unexpected code'), /patch anchor/)
    assert.throws(() => patchBillionContext('unexpected code'), /patch anchor/)
  } finally { rmSync(home, { recursive: true, force: true }) }
})
