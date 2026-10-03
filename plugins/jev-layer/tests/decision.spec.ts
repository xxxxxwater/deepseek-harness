import { afterEach, describe, expect, it, vi } from 'vitest'
import { decide, evaluate } from '../src/decision.ts'
const options = { baseUrl: 'https://api.typesafe.ai', decisionModel: 'jev-latest', decisionTimeoutMs: 50,
  maxResponseBytes: 2048, maxContextChars: 2000, sharpThreshold: 0.85, minMargin: 0.2, maxEntropy: 0.55 }
const candidates = [{ id: 'read', description: 'read source' }, { id: 'search', description: 'search docs' }]
const answer = (p: number) => ({ answers: { decision: { type: 'choice', choice: 'read', confidence: p,
  probabilities: { read: p, search: 1 - p } } } })
afterEach(() => vi.restoreAllMocks())
describe('validated decisions', () => {
  it('routes sharp and ambiguous distributions separately', () => {
    expect(evaluate(answer(0.95), candidates, options).route).toBe('sharp')
    expect(evaluate(answer(0.55), candidates, options).route).toBe('split')
  })
  it.each([
    { answers: { decision: { type: 'choice', choice: 'shell', confidence: 1, probabilities: { shell: 1 } } } },
    { answers: { decision: { type: 'choice', choice: 'read', confidence: 0.95, probabilities: { read: 0.95, search: 0.9 } } } },
    { answers: { decision: { type: 'choice', choice: 'read', confidence: 0.1, probabilities: { read: 0.95, search: 0.05 } } } },
    { answers: { decision: { type: 'choice', choice: 'search', confidence: 0.05, probabilities: { read: 0.95, search: 0.05 } } } },
    { answers: { decision: { type: 'choice', choice: 'read', confidence: 2, probabilities: { read: 2, search: -1 } } } },
  ])('rejects invented, inconsistent or invalid probabilities', raw => {
    expect(() => evaluate(raw, candidates, options)).toThrow()
  })
  it('returns unavailable without invented scores when credentials are absent', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    const result = await decide('state', 'which?', candidates, undefined, options, new AbortController().signal)
    expect(result).toMatchObject({ route: 'unavailable', confidence: null, source: 'none' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('uses the official wire fields and never sends chat-completions requests', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(answer(0.95))))
    const result = await decide('state', 'which?', candidates, 'secret', options, new AbortController().signal)
    expect(result.route).toBe('sharp')
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.typesafe.ai/v1/systemone')
    const init = fetch.mock.calls[0]?.[1]
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: 'jev-latest', state: 'state', questions: {
      decision: { type: 'choice', instructions: 'which?', criteria: { read: 'read source', search: 'search docs' } },
    } })
    expect(init?.redirect).toBe('error')
  })
  it('never returns a provider body or credential in HTTP failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('secret raw task', { status: 401 }))
    const result = await decide('state', 'which?', candidates, 'secret', options, new AbortController().signal)
    expect(result.reason).toContain('401')
    expect(JSON.stringify(result)).not.toContain('secret')
  })
  it('limits the complete response and rejects invalid JSON', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('x'.repeat(3000)))
    expect((await decide('s', 'q', candidates, 'key', options, new AbortController().signal)).route).toBe('unavailable')
    fetch.mockResolvedValue(new Response('{broken'))
    expect((await decide('s', 'q', candidates, 'key', options, new AbortController().signal)).route).toBe('unavailable')
  })
  it('times out a body read and propagates caller cancellation', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      return new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }))
    })
    expect((await decide('s', 'q', candidates, 'key', options, new AbortController().signal)).reason).toContain('timed out')
    const abort = new AbortController()
    const pending = decide('s', 'q', candidates, 'key', { ...options, decisionTimeoutMs: 1000 }, abort.signal)
    abort.abort('cancelled')
    await expect(pending).rejects.toBe('cancelled')
  })
  it('bounds the entire input and rejects duplicate candidate ids before networking', async () => {
    await expect(decide('x'.repeat(3000), 'q', candidates, 'key', options, new AbortController().signal)).rejects.toThrow('maxContextChars')
    await expect(decide('s', 'q', [candidates[0]!, candidates[0]!], 'key', options, new AbortController().signal)).rejects.toThrow('unique')
  })
})
