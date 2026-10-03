import { mkdtemp, readFile, rm, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import LlmRuntime, { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SessionProjections from '@deepseek-ai/dsh-session-projection'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import Subagents from '@deepseek-ai/dsh-subagent'
import * as Spawn from '@deepseek-ai/dsh-subagent-spawn-in-process'
// Exercise the shipped bundle with the same Loader scenarios when requested.
const Plugin = process.env.DSH_JEV_BUNDLE_SMOKE === '1'
  ? await import('../lib/index.js')
  : await import('../src/index.ts')
import LocalCredentials from '@deepseek-ai/dsh-credentials-local'
import { MockAdapter, textResponse, toolCallResponse } from '../../../packages/core/agent-loop/tests/mock-adapter.ts'

let ctx: Context | undefined
let temporary: string | undefined
afterEach(async () => {
  await ctx?.fiber.dispose(); ctx = undefined
  vi.restoreAllMocks()
  if (temporary) await rm(temporary, { recursive: true, force: true })
  temporary = undefined
})
async function boot() {
  const root = new Context(); ctx = root
  temporary = await mkdtemp(join(tmpdir(), 'jev-loader-'))
  root.baseUrl = pathToFileURL(temporary).href + '/'
  await root.plugin(Loader)
  root.loader.builtins.include = Include
  const modules = new Map<string, unknown>([
    ['@deepseek-ai/dsh-llm', LlmRuntime], ['@deepseek-ai/dsh-session', SessionStore],
    ['@deepseek-ai/dsh-session-projection', SessionProjections], ['@deepseek-ai/dsh-agent', AgentRegistry],
    ['@deepseek-ai/dsh-system-prompt', SystemPrompt], ['@deepseek-ai/dsh-tools', Tools],
    ['@deepseek-ai/dsh-agent-loop', AgentLoop], ['@deepseek-ai/dsh-subagent', Subagents],
    ['@deepseek-ai/dsh-subagent-spawn-in-process', Spawn], ['@puregamma/dsh-jev-layer', Plugin],
  ])
  // Keep Loader's real config parsing, activation, injections and teardown. Only module location is substituted.
  root.loader.internal = Object.assign(Object.create(root.loader.internal), { import: async (specifier: string) => {
    if (!modules.has(specifier)) throw new Error(`unexpected import ${specifier}`)
    return modules.get(specifier)
  } })
  const config = join(temporary, 'cordis.yml')
  await copyFile(resolve('plugins/jev-layer/tests/fixtures/cordis.yml'), config)
  await root.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(config).href } })
  await root.loader.await()
  for (const entry of root.loader.entries()) await entry.fiber?.await()
  return root
}
function text(result: { content: { type: string; text?: string }[] }) {
  return result.content.map(b => b.text ?? '').join('')
}
describe('real Loader composition', () => {
  it('loads the namespace plugin with three visible tools and can unload it', async () => {
    const root = await boot()
    expect('default' in Plugin).toBe(false)
    const loader = root.loader
    expect(loader.unwrapExports(Plugin)).toBe(Plugin)
    expect(root.tools.schemas().map(t => t.name)).toEqual(expect.arrayContaining(['jev_decide', 'jev_delegate', 'jev_review']))
    const entry = [...loader.entries()].find(e => e.options.id === 'puregamma-jev-layer')
    expect(entry).toBeDefined()
    await entry?.fiber?.dispose()
    expect(root.tools.get('jev_decide')).toBeUndefined()
    expect(root.tools.get('jev_delegate')).toBeUndefined()
    expect(root.tools.get('jev_review')).toBeUndefined()
  })
  it('runs a full parent turn and logs the unavailable decision without inventing JEV success', async () => {
    const root = await boot()
    const mock = new MockAdapter([
      toolCallResponse('decision', 'jev_decide', { state: 'task', question: 'which file?', candidates: [
        { id: 'auth', description: 'auth source' }, { id: 'billing', description: 'billing source' },
      ] }), textResponse('JEV is not connected; I will inspect auth first.'),
    ])
    root.llm.registerAdapter(['mock'], mock)
    const agent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Inspect this project' }], source: { kind: 'user' } }))
    await agent.whenIdle()
    const events = agent.session.snapshotEvents()
    const result = events.find(e => e.type === 'tool/result')
    expect(result?.type === 'tool/result' && result.data.message.isError, JSON.stringify(events)).toBe(false)
    expect(JSON.stringify(result?.data)).toContain('unavailable')
    expect(JSON.stringify(result?.data)).toContain('confidence')
    expect(events.some(e => e.type === 'assistant/message')).toBe(true)
    expect(events.flatMap(e => {
      if (e.type === 'user/message') return [{ role: 'user', source: e.data.source.kind, content: e.data.content }]
      if (e.type === 'assistant/message' || e.type === 'tool/result') {
        return [{ role: e.data.message.role, source: e.data.message.source.kind, content: e.data.message.content }]
      }
      return []
    })).toMatchSnapshot('recorded model-visible decision transcript')
  })
  it('delegates to a real read-only child, preserves the configured model and returns its findings', async () => {
    const root = await boot()
    const children: string[] = []
    root.on('agent/created', ({ agent }) => { if (agent.session.header.origin === 'subagent') children.push(agent.id) })
    const adapter = new MockAdapter([textResponse('Found four call sites; no files edited.')])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const result = await root.tools.execute({ callId: ToolCallId('child'), name: 'jev_delegate',
      arguments: { role: 'explorer', task: 'Map call sites.' }, agent: parent, signal: new AbortController().signal })
    expect(result.isError, text(result)).toBe(false)
    expect(text(result)).toContain('four call sites')
    expect(adapter.requests[0]?.model).toBe('configured-v4.1')
    expect(root.agents.list()).toHaveLength(1)
    expect(children).toHaveLength(1)
  })
  it('denies a reviewer write even when a scoped tool bypasses the global tool filter', async () => {
    const root = await boot()
    let writes = 0
    root.on('agent/created', ({ agent }) => {
      if (agent.session.header.origin !== 'subagent') return
      agent.ctx.tools.register(defineContentToolFixture({ name: 'write', description: 'test write', parameters: {},
        async execute() { writes++; return [{ type: 'text', text: 'written' }] } }))
    })
    const adapter = new MockAdapter([toolCallResponse('bad-write', 'write', {}), textResponse('Write denied; findings only.')])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const result = await root.tools.execute({ callId: ToolCallId('review'), name: 'jev_review',
      arguments: { moment: 'before_plan', evidence: 'Review this plan.' }, agent: parent, signal: new AbortController().signal })
    expect(result.isError, text(result)).toBe(false)
    expect(writes).toBe(0)
    expect(adapter.requests[1]?.messages.some(m => JSON.stringify(m).includes('cannot execute write'))).toBe(true)
  })
  it('dispatches an auto role only for a sharp JEV decision', async () => {
    const root = await boot()
    await root.plugin(LocalCredentials, { path: join(temporary!, 'credentials.json') })
    vi.spyOn(root.credentials, 'resolve').mockResolvedValue({ value: 'test-key', source: 'test', writable: false })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answers: { decision: {
      type: 'choice', choice: 'explorer', confidence: 0.98, probabilities: { worker: 0.01, explorer: 0.98, researcher: 0.01 },
    } } })))
    const adapter = new MockAdapter([textResponse('Mapped source files.')])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const result = await root.tools.execute({ callId: ToolCallId('auto'), name: 'jev_delegate',
      arguments: { role: 'auto', task: 'Map the code before proposing edits.' }, agent: parent, signal: new AbortController().signal })
    expect(result.isError, text(result)).toBe(false)
    expect(text(result)).toContain('sharp')
    expect(text(result)).toContain('Mapped source files')
  })
  it('does not dispatch on an ambiguous auto decision', async () => {
    const root = await boot()
    await root.plugin(LocalCredentials, { path: join(temporary!, 'credentials.json') })
    vi.spyOn(root.credentials, 'resolve').mockResolvedValue({ value: 'test-key', source: 'test', writable: false })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answers: { decision: {
      type: 'choice', choice: 'explorer', confidence: 0.4, probabilities: { worker: 0.3, explorer: 0.4, researcher: 0.3 },
    } } })))
    const adapter = new MockAdapter([])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const result = await root.tools.execute({ callId: ToolCallId('auto-split'), name: 'jev_delegate',
      arguments: { role: 'auto', task: 'Handle this task.' }, agent: parent, signal: new AbortController().signal })
    expect(result.isError, text(result)).toBe(false)
    expect(text(result)).toContain('handback')
    expect(text(result)).toContain('split')
    expect(adapter.requests).toHaveLength(0)
  })
  it('cancels a running child and releases its capacity', async () => {
    const root = await boot()
    const adapter = new MockAdapter(['hang', textResponse('second task complete')])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const controller = new AbortController()
    const pending = root.tools.execute({ callId: ToolCallId('cancel'), name: 'jev_delegate',
      arguments: { role: 'explorer', task: 'Read source.' }, agent: parent, signal: controller.signal })
    await vi.waitFor(() => expect(adapter.requests).toHaveLength(1))
    controller.abort('cancel child')
    expect((await pending).isError).toBe(true)
    expect(root.agents.list()).toHaveLength(1)
    const next = await root.tools.execute({ callId: ToolCallId('after-cancel'), name: 'jev_delegate',
      arguments: { role: 'explorer', task: 'Read again.' }, agent: parent, signal: new AbortController().signal })
    expect(next.isError, text(next)).toBe(false)
    expect(text(next)).toContain('second task complete')
  })
  it('disabling the plugin aborts and awaits an active child', async () => {
    const root = await boot()
    const adapter = new MockAdapter(['hang-slow'])
    root.llm.registerAdapter(['mock'], adapter)
    const parent = await root.agentLoop.create(SessionId('parent'), { provider: 'mock', model: 'configured-v4.1' })
    const pending = root.tools.execute({ callId: ToolCallId('unload-active'), name: 'jev_delegate',
      arguments: { role: 'explorer', task: 'Read source.' }, agent: parent, signal: new AbortController().signal })
    await vi.waitFor(() => expect(adapter.requests).toHaveLength(1))
    const entry = [...root.loader.entries()].find(e => e.options.id === 'puregamma-jev-layer')
    await entry?.fiber?.dispose()
    expect((await pending).isError).toBe(true)
    expect(root.agents.list()).toHaveLength(1)
    expect(root.tools.get('jev_delegate')).toBeUndefined()
  })
  it('ships a recognized bundle and platform-independent package metadata', async () => {
    const manifest = JSON.parse(await readFile('plugins/jev-layer/package.json', 'utf8'))
    expect(manifest.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(manifest.os).toBeUndefined()
    expect(manifest.cpu).toBeUndefined()
    expect(manifest.scripts?.install).toBeUndefined()
    expect(await readFile('plugins/jev-layer/cordis.patch.yml', 'utf8')).toContain("name: '@puregamma/dsh-jev-layer'")
  })
})
