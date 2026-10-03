/** Optional native DSH plugin; all writing and approval stay in the host tool pipeline. */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContextFormed } from '@deepseek-ai/dsh-llm'
declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    'puregamma-jev': { kind: 'puregamma-jev' } & ContextFormed
  }
}
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-subagent'
import { decide } from './decision.ts'
import type { DecisionOptions } from './decision.ts'

export const name = 'puregamma-jev-layer'
export const inject = ['tools', 'systemPrompt', 'subagents']

/** Local plugin choices; model selection is inherited from each calling parent. */
export interface Config extends DecisionOptions {
  apiKeyEnv: string; subagentProvider: string; childTimeoutMs: number; maxConcurrentChildren: number
  failureThreshold: number; reviewBeforeDone: boolean; readTools: string[]
}
/** UI-editable limits; no secret is placed in the plugin configuration. */
export const Config: z<Config> = z.object({
  apiKeyEnv: z.string().role('credential-ref').default('TYPESAFE_API_KEY'),
  baseUrl: z.string().default('https://api.typesafe.ai'), decisionModel: z.string().default('jev-latest'),
  subagentProvider: z.string().default('spawn'), sharpThreshold: z.number().min(0).max(1).default(0.85),
  minMargin: z.number().min(0).max(1).default(0.20), maxEntropy: z.number().min(0).max(1).default(0.55),
  decisionTimeoutMs: z.number().default(1500), childTimeoutMs: z.number().default(120000),
  maxConcurrentChildren: z.number().default(3), maxContextChars: z.number().default(16000),
  maxResponseBytes: z.number().default(131072), failureThreshold: z.number().default(2),
  reviewBeforeDone: z.boolean().default(false),
  readTools: z.array(z.string()).default(['read', 'glob', 'grep', 'web_search', 'web_fetch']),
})

const ROLES = ['worker', 'explorer', 'researcher', 'reviewer'] as const
type Role = typeof ROLES[number]
const PERSONAS: Record<Role, string> = {
  worker: 'Implement the assigned change within its scope. Run relevant checks. Report files, evidence and unresolved failures. Do not delegate.',
  explorer: 'Inspect the code and map relevant files and call sites. Return evidence. Do not modify files or delegate.',
  researcher: 'Read available documentation and report supported APIs with sources. Do not modify files or delegate.',
  reviewer: 'Review the supplied plan, diff or failure evidence. Return concrete findings and missing checks. Do not write code, claim approval or delegate.',
}
const INSTRUCTION = 'Use jev_decide for bounded file, tool, role or retry choices with at least two candidates. '
  + 'A sharp result selects a candidate but grants no permission. Split or unavailable returns the choice to you. '
  + 'Use jev_delegate for independent worker, explorer or researcher tasks; you own integration and verification. '
  + 'Use jev_review before a substantial plan, after repeated errors and before declaring a substantial change complete. '
  + 'Review is advice, never a substitute for tests or host approval.'
const CHILD_LABEL = 'puregamma-jev:'

/** Local input bounds and HTTPS transport policy fail during plugin activation. */
function validate(config: Config): void {
  credentialRef(config.apiKeyEnv)
  const endpoint = new URL(config.baseUrl)
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('JEV baseUrl must be HTTPS without credentials, query or fragment')
  }
  for (const field of ['decisionTimeoutMs', 'childTimeoutMs', 'maxConcurrentChildren', 'maxContextChars',
    'maxResponseBytes', 'failureThreshold'] as const) {
    if (!Number.isSafeInteger(config[field]) || config[field] < 1) throw new Error(`JEV ${field} must be a positive integer`)
  }
  if (config.readTools.some(t => t.startsWith('jev_')) || new Set(config.readTools).size !== config.readTools.length) {
    throw new Error('JEV readTools must contain unique non-JEV tool names')
  }
}

/** Extract only this plugin's durable child role, before a child can call tools. */
function childRole(agent: Agent): Role | undefined {
  if (agent.session.header.origin !== 'subagent') return undefined
  for (const event of agent.session.snapshotEvents()) {
    if (event.type !== 'subagent/descriptor' || !event.data.label?.startsWith(CHILD_LABEL)) continue
    const role = event.data.label.slice(CHILD_LABEL.length)
    return ROLES.find(r => r === role)
  }
  return undefined
}

/**
 * Register decision, delegation and review tools with lifecycle-owned effects.
 * @param ctx - the host plugin context.
 * @param config - validated limits, endpoint and optional review policy.
 */
export function apply(ctx: Context, config: Config): void {
  validate(config)
  const pluginAbort = new AbortController()
  const operations = new Set<Promise<unknown>>()
  let activeChildren = 0
  const failures = new WeakMap<Agent, { name: string; count: number }>()
  const reviewedTurns = new WeakMap<Agent, number>()
  ctx.effect(() => async () => {
    pluginAbort.abort('JEV plugin disposed')
    await Promise.allSettled([...operations])
  })

  /** Own all in-flight work so disabling the plugin waits for child teardown. */
  function own<T>(operation: Promise<T>): Promise<T> {
    operations.add(operation)
    void operation.finally(() => operations.delete(operation)).catch(() => {})
    return operation
  }
  /** Resolve DSH's credential store first; environment supports headless launches. */
  async function apiKey(): Promise<string | undefined> {
    const record = await ctx.get('credentials')?.resolve(credentialRef(config.apiKeyEnv))
    return record?.value || process.env[config.apiKeyEnv]
  }
  /** One-shot delegation keeps one controller from reservation through quiescent cleanup. */
  async function delegate(parent: Agent, role: Role, task: string, signal: AbortSignal) {
    signal.throwIfAborted()
    if (parent.session.header.origin === 'subagent') throw new Error('JEV delegation is only available to a root agent')
    if (task.length > config.maxContextChars) throw new Error('JEV task exceeds maxContextChars; summarize it')
    if (activeChildren >= config.maxConcurrentChildren) throw new Error('JEV child capacity reached; collect a running child first')
    const provider = ctx.subagents.getProvider(config.subagentProvider)
    if (!provider) throw new Error(`JEV subagent provider ${config.subagentProvider} is not loaded`)
    if (!provider.capabilities.toolFilter || !provider.capabilities.persona || !provider.capabilities.depthLimit) {
      throw new Error('JEV requires a provider supporting tool filters, personas and depth limits')
    }
    const tools = role === 'worker' ? undefined : config.readTools.filter(t => ctx.tools.get(t, scopeOf(parent.ctx)) !== undefined)
    activeChildren++
    const boundedSignal = AbortSignal.any([signal, pluginAbort.signal, AbortSignal.timeout(config.childTimeoutMs)])
    try {
      const run = await ctx.subagents.start(config.subagentProvider, {
        parent, signal: boundedSignal, label: CHILD_LABEL + role, maxDepth: 1,
        persona: PERSONAS[role],
        toolFilter: tools === undefined ? { deny: ['jev_decide', 'jev_delegate', 'jev_review'] } : { allow: tools },
        prompt: [{ type: 'text', text: task }],
      })
      try {
        const result = await run.result
        boundedSignal.throwIfAborted()
        if (result.stopReason !== 'completed') throw new Error(`JEV ${role} ended with ${result.stopReason}; result is incomplete`)
        const text = result.output.filter(b => b.type === 'text').map(b => b.text).join('\n')
        if (text.length > config.maxContextChars) throw new Error('JEV child output exceeds maxContextChars')
        return { role, text, status: 'completed' }
      } finally { await run.dispose() }
    } finally { activeChildren-- }
  }

  ctx.systemPrompt.section({ name, order: ctx.systemPrompt.getSectionOrder('TOOL_SUBAGENT'),
    text: INSTRUCTION, interpolate: false })

  ctx.tools.register(defineTool({
    name: 'jev_decide',
    description: 'Select among explicit file, tool, role or retry candidates. Returns JEV probabilities and sharp/split/unavailable. Does not execute the selected action.',
    parameters: {
      state: { type: 'string', required: true, description: 'Compact task evidence; omit secrets.' },
      question: { type: 'string', required: true },
      candidates: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
        id: { type: 'string', required: true }, description: { type: 'string', required: true },
      } } },
    },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      const signal = AbortSignal.any([exec.signal, pluginAbort.signal])
      return own((async () => {
        const result = await decide(args.state, args.question, args.candidates, await apiKey(), config, signal)
        return { ...result, probabilities: { ...result.probabilities } }
      })())
    },
    presentCall: args => ({ card: 'generic', title: 'JEV decision', kind: 'other', rawInput: args.question }),
  }))
  ctx.tools.register(defineTool({
    name: 'jev_delegate', description: 'Run a worker, explorer or researcher with your current model. role=auto asks JEV to select a role and only dispatches a sharp decision; split/unavailable returns to you. The parent integrates and verifies results.',
    parameters: { role: { type: 'string', enum: ['auto', 'worker', 'explorer', 'researcher'], required: true },
      task: { type: 'string', required: true } },
    isConcurrencySafe: args => args.role === 'explorer' || args.role === 'researcher',
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('JEV delegation requires an owning agent')
      const parent = exec.agent
      return own((async () => {
        if (args.role !== 'auto') return delegate(parent, args.role, args.task, exec.signal)
        const signal = AbortSignal.any([exec.signal, pluginAbort.signal])
        const decision = await decide(args.task, 'Which role is needed next for this task?',
          ['worker', 'explorer', 'researcher'].map(id => ({ id, description: PERSONAS[id as Role] })),
          await apiKey(), config, signal)
        const role = ROLES.find(r => r === decision.selected)
        if (decision.route !== 'sharp' || role === undefined) return { status: 'handback', decision: { ...decision } }
        return { ...await delegate(parent, role, args.task, signal), decision: { ...decision } }
      })())
    },
    presentCall: args => ({ card: 'generic', title: 'JEV delegation', kind: 'other', rawInput: args }),
  }))
  ctx.tools.register(defineTool({
    name: 'jev_review', description: 'Ask a separate read-only reviewer using your current model before planning, after repeated errors or before completion. Supply evidence, proposed changes and actual check results.',
    parameters: { moment: { type: 'string', enum: ['before_plan', 'repeated_error', 'before_done'], required: true },
      evidence: { type: 'string', required: true } },
    output: { schema: { type: 'json' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    async execute(args, exec) {
      if (!exec.agent) throw new Error('JEV review requires an owning agent')
      return own(delegate(exec.agent, 'reviewer', `${args.moment}\n${args.evidence}`, exec.signal))
    },
    presentCall: args => ({ card: 'generic', title: 'JEV review', kind: 'other', rawInput: args.moment }),
  }))

  // Runtime enforcement also covers scoped tools that the global filter does not hide.
  ctx.on('tools/pre-execute', async (exec, next) => {
    const role = exec.agent === undefined ? undefined : childRole(exec.agent)
    if (role !== undefined && (exec.name.startsWith('jev_')
      || (role !== 'worker' && !config.readTools.includes(exec.name)))) {
      return { kind: 'deny', reason: `JEV ${role} cannot execute ${exec.name}` }
    }
    return next()
  })
  ctx.on('agent/pre-step', ({ agent, messages }, next) => {
    if (messages.some(message => message.source.kind === 'user')) failures.delete(agent)
    return next()
  })
  ctx.on('tools/post-execute', async (exec, result, next) => {
    const downstream = await next()
    if (!exec.agent || exec.agent.session.header.origin === 'subagent') return downstream
    const previous = failures.get(exec.agent)
    const count = result.isError ? previous?.name === exec.name ? previous.count + 1 : 1 : 0
    failures.set(exec.agent, { name: exec.name, count })
    if (count !== config.failureThreshold) return downstream
    const context = createUserMessage({ content: [{ type: 'text',
      text: `Tool ${exec.name} failed ${count} consecutive times. Re-read the errors; use jev_decide for retry/switch/stop or jev_review with failure evidence. Do not blindly repeat the call.` }],
      source: { kind: 'puregamma-jev', form: 'notice', summary: 'JEV review or recovery advice' } })
    return { ...downstream, additionalContexts: [...downstream.additionalContexts ?? [], context] }
  })
  ctx.on('agent/turn-stopping', async ({ agent, turn, signal }) => {
    if (!config.reviewBeforeDone || agent.session.header.origin === 'subagent' || reviewedTurns.get(agent) === turn) return
    reviewedTurns.set(agent, turn)
    const evidence = agent.session.snapshotEvents().filter(e => e.type === 'assistant/message' || e.type === 'tool/result')
      .slice(-8).map(e => JSON.stringify(e.data)).join('\n').slice(-config.maxContextChars)
    if (!evidence) return
    const report = await own(delegate(agent, 'reviewer', `before_done\nReview this recorded task evidence:\n${evidence}`, signal))
    signal.throwIfAborted()
    agent.steer(createUserMessage({ content: [{ type: 'text', text: `Independent review findings:\n${report.text}\nAddress findings and verify the result before finishing.` }], source: { kind: 'puregamma-jev', form: 'notice', summary: 'JEV review or recovery advice' } }))
  })
}
