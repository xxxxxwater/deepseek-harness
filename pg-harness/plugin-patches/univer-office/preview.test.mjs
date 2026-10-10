import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { installUniverPreviewBridge, patchUniverClient } from './patch.mjs'

const repoRequire = createRequire(new URL('../../../apps/web/package.json', import.meta.url))
const React = repoRequire('react')
const jsx = repoRequire('react/jsx-runtime')
const rootRequire = createRequire(new URL('../../../package.json', import.meta.url))
const { JSDOM } = rootRequire('jsdom')
const archive = fileURLToPath(new URL('../../bundled-plugins/dsh-univer-office-0.3.7.tgz', import.meta.url))
const original = execFileSync('tar', ['-xOf', archive, 'package/lib/client.js'], { maxBuffer: 2_000_000 }).toString()
const fixed = patchUniverClient(original)
const file = '/workspace/demo.univer'
const args = (value = {}) => ({ value: key => value[key] })
const running = (name, id, fields = {}) => ({ name, callId: id, phase: 'start', argsRaw: JSON.stringify({ file, ...fields }), args: args(), subCalls: [] })
const settled = (name, id, seq, fields = {}, failed = false) => ({
  name, callId: id, kind: 'tool-result', seq, call: { argsRaw: JSON.stringify({ file, ...fields }) }, args: args(), subCalls: [],
  isError: failed, content: [{ type: 'text', text: JSON.stringify({ operation: name.slice(7).replaceAll('_', '-'), file, result: fields }) }],
})
const parent = subCalls => ({ ...running('run_code', 'root'), subCalls })

function load(source, environment = {}) {
  let result
  const window = environment.window ?? {}
  window.__ModuleLoader__ = { load: ({ factory }) => { result = factory(spec => {
    if (spec === 'react') return React
    if (spec === 'react/jsx-runtime') return jsx
    throw new Error('Unexpected client dependency: ' + spec)
  }) } }
  const instrumented = source.replace('    return module.exports;', '    return { PreviewCard, UniverDock, univerTurnDefinition, projectChatTools: typeof projectChatTools === "undefined" ? undefined : projectChatTools, outcomeOfTurnFile };')
  runInNewContext(instrumented, { window, console, ...environment })
  return result
}
const plugin = load(fixed)
const project = roots => JSON.parse(JSON.stringify(plugin.projectChatTools(roots.map(root => ({ root })))))

test('native and arbitrarily nested PTC calls produce one file operation per call id', () => {
  const pending = running('univer_execute', 'edit', { worktreeId: 'wt' })
  const roots = [settled('univer_new', 'new', 1), parent([parent([pending]), pending])]
  assert.deepEqual(project(roots)[0].operations.map(op => [op.callId, op.phase]), [['new', 'succeeded'], ['edit', 'pending']])
  assert.equal(project([parent([{ ...pending, phase: 'preparing' }])]).length, 0)
  assert.equal(project([running('shell', 'shell')]).length, 0)
})

test('ready followed by reads retains ready lifecycle; failed writes stay failed', () => {
  const roots = [parent([
    settled('univer_status', 'status', 4, { worktreeId: 'wt' }),
    settled('univer_execute', 'failed', 5, { worktreeId: 'wt' }, true),
    settled('univer_worktree', 'ready', 3, { worktreeId: 'wt', action: 'ready' }),
  ])]
  const target = project(roots)[0]
  assert.equal(plugin.outcomeOfTurnFile(target).lifecycle, 'ready')
  assert.equal(target.operations.at(-1).phase, 'failed')
})

test('result-only windows recover structured file targets without parsing code text', () => {
  const result = { ...settled('univer_execute', 'result', 1, { worktreeId: 'wt' }), name: '', call: null }
  assert.equal(project([parent([result])])[0].operations[0].worktreeId, 'wt')
})

test('compatibility installation backs up the exact client and preserves custom versions', () => {
  const home = mkdtempSync(join(tmpdir(), 'pg-office-patch-'))
  try {
    const root = join(home, 'profile', 'node_modules', 'dsh-univer-office')
    mkdirSync(join(root, 'lib'), { recursive: true })
    writeFileSync(join(root, 'package.json'), '{"version":"0.3.7"}')
    writeFileSync(join(root, 'lib', 'client.js'), original)
    const backup = join(home, 'backup')
    assert.equal(installUniverPreviewBridge(join(home, 'profile'), backup), true)
    assert.equal(readFileSync(join(backup, 'dsh-univer-office-client.js'), 'utf8'), original)
    assert.equal(installUniverPreviewBridge(join(home, 'profile'), backup), false)
    writeFileSync(join(root, 'package.json'), '{"version":"0.3.8"}')
    writeFileSync(join(root, 'lib', 'client.js'), 'custom client')
    assert.equal(installUniverPreviewBridge(join(home, 'profile'), backup), false)
    assert.equal(readFileSync(join(root, 'lib', 'client.js'), 'utf8'), 'custom client')
    assert.throws(() => patchUniverClient('unknown client'), /Unrecognized/)
  } finally { rmSync(home, { recursive: true, force: true }) }
})

test('PTC notifications restore conversation cards and floating previews with stable Chat identity', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://preview.test/' })
  const previous = Object.fromEntries(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let root
  try {
    for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, IS_REACT_ACT_ENVIRONMENT: true })) {
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
    }
    const { createRoot } = repoRequire('react-dom/client')
    root = createRoot(dom.window.document.getElementById('root'))
    const listeners = new Set()
    let tools = []
    const source = { getSnapshot: () => tools, subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) } }
    const timeline = { turnOrder: [1], turns: new Map([[1, { data: new Map() }]]) }
    const nodes = { turnDataSource: (turn, kind) => { assert.equal(turn, 1); assert.equal(kind, 'tool-call'); return source } }
    const chat = { nodes, timeline }
    const requests = []
    const state = { file, viewerUrl: 'http://viewer.test/?file=demo', worktrees: [{ worktreeId: 'wt', status: 'draft', name: 'Draft', units: [], openUrl: 'http://viewer.test/?file=demo&worktree=wt', worktreeUrl: 'http://viewer.test/?file=demo&worktree=wt' }] }
    const fetch = async url => {
      const request = new URL(url)
      assert.equal(request.pathname, '/univer-api/state')
      assert.equal(request.searchParams.get('sessionId'), 'fixture-session')
      requests.push(request.searchParams.get('file'))
      return { ok: true, json: async () => state }
    }
    const prefs = { getSnapshot: () => ({ livePreview: true, conversationReviewCards: true }), subscribe: () => () => {} }
    const props = { sessionId: 'fixture-session', session: { running: true }, turn: { turn: 1, data: new Map() }, preferences: prefs, useChat: select => select(chat), useSessions: select => select({ byId: { 'fixture-session': { cwd: '/workspace' } } }), t: key => key, getViewerLocale: () => 'en-US' }
    const render = client => React.createElement(React.Fragment, null, React.createElement(client.PreviewCard, props), React.createElement(client.UniverDock, props))
    const environment = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, fetch, setTimeout, clearTimeout, URL }
    const oldClient = load(original, environment)
    await React.act(async () => root.render(render(oldClient)))
    tools = [{ root: parent([settled('univer_worktree', 'create', 1, { action: 'create', worktreeId: 'wt' })]) }]
    await React.act(async () => { for (const notify of listeners) notify() })
    assert.equal(dom.window.document.querySelectorAll('.uvf_panel, .uvf_win').length, 0, 'negative control: upstream 0.3.7 misses PTC')
    tools = []
    const client = load(fixed, environment)
    await React.act(async () => root.render(render(client)))
    tools = [{ root: parent([settled('univer_worktree', 'create', 1, { action: 'create', worktreeId: 'wt' })]) }]
    await React.act(async () => { for (const notify of listeners) notify() })
    assert.equal(dom.window.document.querySelectorAll('.uvf_panel').length, 1)
    assert.equal(dom.window.document.querySelectorAll('.uvf_win').length, 1)
    assert.ok(dom.window.document.querySelector('.uvf_panel iframe'))
    assert.ok(dom.window.document.querySelector('.uvf_win iframe'))
    assert.ok(requests.includes(file))
    await React.act(async () => root.unmount())
    root = undefined
    assert.equal(listeners.size, 0)
  } finally {
    if (root) await React.act(async () => root.unmount())
    dom.window.close()
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
