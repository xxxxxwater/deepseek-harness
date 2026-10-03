/** Bounded TypeSafe System One HTTP requests and validated choice distributions. */
import { z } from 'zod'

/** One permitted choice; ids are meaningful only within this decision request. */
export interface Candidate { id: string; description: string }
/** Deployment limits for one independent decision call. */
export interface DecisionOptions {
  baseUrl: string; decisionModel: string; decisionTimeoutMs: number; maxResponseBytes: number
  maxContextChars: number; sharpThreshold: number; minMargin: number; maxEntropy: number
}
/** A decision report never grants permission to execute the selected candidate. */
export interface Decision {
  route: 'sharp' | 'split' | 'unavailable'
  selected: string | null
  confidence: number | null
  margin: number | null
  entropy: number | null
  probabilities: Record<string, number>
  source: 'jev' | 'none'
  reason: string
}

const answerSchema = z.object({
  answers: z.object({ decision: z.object({
    type: z.literal('choice'), choice: z.string(), confidence: z.number().min(0).max(1),
    probabilities: z.record(z.string(), z.number().min(0).max(1)),
  }) }),
})

/**
 * Return a handback without invented scores when the provider cannot decide.
 * @param reason - bounded diagnostic without request or credential data.
 * @returns a report for the parent model.
 */
export function handback(reason: string): Decision {
  return { route: 'unavailable', selected: null, confidence: null, margin: null, entropy: null,
    probabilities: {}, source: 'none', reason }
}

/**
 * Validate candidate identity, mass, selected maximum and confidence before routing.
 * @param raw - untrusted provider JSON.
 * @param candidates - the complete permitted choice list.
 * @param options - confidence, margin and entropy thresholds.
 * @returns a validated choice or a low-confidence handback.
 */
export function evaluate(raw: unknown, candidates: Candidate[], options: DecisionOptions): Decision {
  const { answers: { decision: answer } } = answerSchema.parse(raw)
  const keys = Object.keys(answer.probabilities)
  if (keys.length !== candidates.length || candidates.some(c => !Object.hasOwn(answer.probabilities, c.id))) {
    throw new Error('invalid probability labels')
  }
  const values = Object.values(answer.probabilities).sort((a, b) => b - a)
  const p = answer.probabilities[answer.choice]
  const total = values.reduce((a, b) => a + b, 0)
  if (p === undefined || Math.abs(total - 1) > 0.02 || p !== values[0]
    || Math.abs(p - answer.confidence) > 0.02) throw new Error('inconsistent probabilities')
  const margin = p - (values[1] ?? 0)
  const entropy = -values.reduce((sum, value) => sum + (value === 0 ? 0 : value * Math.log(value)), 0)
    / Math.log(values.length)
  const sharp = p >= options.sharpThreshold && margin >= options.minMargin && entropy <= options.maxEntropy
  return { route: sharp ? 'sharp' : 'split', selected: answer.choice, confidence: p, margin, entropy,
    probabilities: answer.probabilities, source: 'jev',
    reason: sharp ? 'provider confidence passes configured thresholds; permission is unchanged'
      : 'ambiguous decision; parent model must choose the next action' }
}

/** Read the complete response within a byte limit; cancellation covers the body. */
async function boundedJson(response: Response, limit: number, signal: AbortSignal): Promise<unknown> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('empty response')
  const chunks: Uint8Array[] = []
  let bytes = 0
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const item = await reader.read()
      if (item.done) break
      bytes += item.value.byteLength
      if (bytes > limit) throw new Error('response exceeds byte limit')
      chunks.push(item.value)
    }
    signal.throwIfAborted()
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } finally {
    signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

/**
 * Ask the official Choice endpoint; failures return unavailable, caller abort propagates.
 * @param state - compact, explicit task state; never the automatic whole conversation.
 * @param question - the bounded choice question.
 * @param candidates - distinct options proposed by the parent model.
 * @param apiKey - resolved credential, or absent when unconfigured.
 * @param options - endpoint and deployment limits.
 * @param signal - calling tool cancellation.
 * @returns validated decision evidence; no candidate is executed here.
 */
export async function decide(state: string, question: string, candidates: Candidate[], apiKey: string | undefined,
  options: DecisionOptions, signal: AbortSignal): Promise<Decision> {
  signal.throwIfAborted()
  if (candidates.length < 2 || candidates.length > 32 || new Set(candidates.map(c => c.id)).size !== candidates.length
    || candidates.some(c => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(c.id))) throw new Error('provide 2–32 unique candidate ids')
  const body = JSON.stringify({ model: options.decisionModel, state,
    questions: { decision: { type: 'choice', instructions: question,
      criteria: Object.fromEntries(candidates.map(c => [c.id, c.description])) } } })
  if (body.length > options.maxContextChars) throw new Error('decision request exceeds maxContextChars; summarize it')
  if (!apiKey) return handback('JEV is not connected; configure TYPESAFE_API_KEY in DSH credentials')
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(options.decisionTimeoutMs)])
  try {
    const response = await fetch(`${options.baseUrl.replace(/\/$/, '')}/v1/systemone`, {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body, signal: boundedSignal, redirect: 'error',
    })
    if (!response.ok) {
      await response.body?.cancel()
      return handback(`JEV HTTP ${response.status}; parent model must decide`)
    }
    return evaluate(await boundedJson(response, options.maxResponseBytes, boundedSignal), candidates, options)
  } catch (error) {
    // Provider diagnostics never include raw error bodies, task state or credentials.
    signal.throwIfAborted()
    return handback(boundedSignal.aborted ? 'JEV decision timed out; parent model must decide'
      : error instanceof z.ZodError ? 'JEV returned invalid decision fields' : 'JEV request or probability validation failed')
  }
}
