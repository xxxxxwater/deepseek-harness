import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const upstreamClientSha256 = 'e607e231178e0e31b5964d875b19bd63a551ec5230c09948658f4a71709055fd'
const marker = '// PureGamma Univer PTC preview bridge v1'

/** Patch the exact shipped 0.3.7 client; an unknown or newer build stays untouched. */
export function patchUniverClient(source) {
  if (source.includes(marker)) return source
  if (createHash('sha256').update(source).digest('hex') !== upstreamClientSha256) {
    throw new Error('Unrecognized Univer 0.3.7 client; refusing to overwrite it.')
  }
  const replace = (before, after) => {
    if (!source.includes(before)) throw new Error('Univer preview patch anchor missing: ' + before.slice(0, 60))
    source = source.replace(before, after)
  }
  const bridge = readFileSync(new URL('./preview-bridge.mjs', import.meta.url), 'utf8').replaceAll('export function ', 'function ')
  replace('    // src/client/components/preview-card.tsx', `    ${marker}\n${bridge}\n    function projectChatTools(tools) {\n      return projectUniverToolRoots(tools.map(data => data.root), { addCall, applyResult });\n    }\n\n    // src/client/components/preview-card.tsx`)
  replace('      const matched = selectUniverTurn(props);\n      const timeline = props.useChat((snapshot) => snapshot.timeline);', `      const timeline = props.useChat((snapshot) => snapshot.timeline);\n      const nodes = props.useChat((snapshot) => snapshot.nodes);\n      const tools = useUniverTurnTools(React4, nodes, props.turn.turn);\n      const files = React4.useMemo(() => projectChatTools(tools), [tools]);\n      const matched = files.length === 0 ? null : { turn: props.turn.turn, files };`)
  replace('...props, matched, timeline, cwd', '...props, matched, timeline, nodes, tools, cwd')
  replace('latestWorktreeTurns(props.timeline), [props.timeline]', 'latestWorktreeTurns(props.timeline, props.nodes), [props.timeline, props.nodes, props.tools]')
  replace('function latestWorktreeTurns(timeline)', 'function latestWorktreeTurns(timeline, nodes)')
  replace('        const data = turn.data.get("univerTurn");\n        if (data === void 0) continue;\n        for (const file of data.files)', '        const files = projectChatTools(nodes.turnDataSource(turnNumber, "tool-call").getSnapshot());\n        for (const file of files)')
  replace('    function UniverDock(props) {\n      const timeline = props.useChat((snapshot) => snapshot.timeline);', `    function UniverDock(props) {\n      const timeline = props.useChat((snapshot) => snapshot.timeline);\n      const nodes = props.useChat((snapshot) => snapshot.nodes);\n      const tools = useUniverTurnTools(React12, nodes, timeline.turnOrder.at(-1));\n      const files = React12.useMemo(() => projectChatTools(tools), [tools]);`)
  replace('          timeline,\n          cwd,\n          running:', '          files,\n          cwd,\n          running:')
  replace('() => turnFilesOfTimeline(props.timeline, props.cwd),\n        [props.timeline, props.cwd]', '() => resolveTurnFiles(props.files, props.cwd),\n        [props.files, props.cwd]')
  return source
}

/** Apply the compatibility fix with a recoverable client backup; preserve dependency pins. */
export function installUniverPreviewBridge(profile, backup) {
  const root = join(profile, 'node_modules', 'dsh-univer-office')
  const manifest = join(root, 'package.json')
  if (!existsSync(manifest) || JSON.parse(readFileSync(manifest, 'utf8')).version !== '0.3.7') return false
  const path = join(root, 'lib', 'client.js')
  const previous = readFileSync(path, 'utf8')
  const next = patchUniverClient(previous)
  if (next === previous) return false
  mkdirSync(backup, { recursive: true, mode: 0o700 })
  cpSync(path, join(backup, 'dsh-univer-office-client.js'))
  const pending = path + '.pg-pending'
  writeFileSync(pending, next)
  renameSync(pending, path)
  return true
}
