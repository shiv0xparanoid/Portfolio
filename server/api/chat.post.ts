/**
 * Grounded Telebot endpoint. Anthropic is a server-only, optional selector;
 * answers and citations are always built from the validated content catalog.
 */
import { Buffer } from 'node:buffer'
import { chatRequestSchema, CHAT_LIMITS, encodeSse } from '~~/shared/chat'
import { getSources } from '../utils/content'
import { buildGroundedAnswer, selectGrounding } from '../utils/grounding'
import { checkChatRateLimit } from '../utils/rate-limit'

const SELECTOR_TIMEOUT_MS = 3_500
const BODY_TIMEOUT_MS = 5_000

function badRequest(event: any, statusCode: number, code: string) {
  return sendError(event, createError({ statusCode, statusMessage: code, data: { code } }))
}

/** Enforce the byte cap while receiving chunks, before buffering the body. */
function readBoundedBody(event: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = event.node.req
    const chunks: Buffer[] = []
    let bytes = 0
    let settled = false
    const cleanup = () => {
      clearTimeout(timeout)
      request.removeListener('data', onData)
      request.removeListener('end', onEnd)
      request.removeListener('error', onError)
      request.removeListener('aborted', onAborted)
    }
    const fail = (code: string) => {
      if (settled) return
      settled = true
      cleanup()
      // Stop consuming this request once its bounded reader is gone.
      request.pause()
      reject(new Error(code))
    }
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += buffer.byteLength
      if (bytes > CHAT_LIMITS.bodyBytes) { fail('BODY_TOO_LARGE'); return }
      chunks.push(buffer)
    }
    const onEnd = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(Buffer.concat(chunks, bytes).toString('utf8'))
    }
    const onError = () => fail('BAD_BODY')
    const onAborted = () => fail('CLIENT_ABORTED')
    const timeout = setTimeout(() => fail('BODY_TIMEOUT'), BODY_TIMEOUT_MS)
    request.on('data', onData)
    request.once('end', onEnd)
    request.once('error', onError)
    request.once('aborted', onAborted)
    if (request.aborted || request.destroyed) fail('CLIENT_ABORTED')
  })
}

export default defineEventHandler(async (event) => {
  const contentLength = Number(event.node.req.headers['content-length'] || 0)
  if (Number.isFinite(contentLength) && contentLength > CHAT_LIMITS.bodyBytes) {
    return badRequest(event, 413, 'BODY_TOO_LARGE')
  }

  // Apply the bounded, process-local limiter before accepting an upload.
  const rate = checkChatRateLimit(event)
  if (!rate.ok) {
    setResponseHeader(event, 'Retry-After', String(rate.retryAfterSeconds))
    return badRequest(event, 429, 'RATE_LIMITED')
  }
  setResponseHeader(event, 'X-RateLimit-Remaining', String(rate.remaining))

  let rawBody = ''
  try {
    rawBody = await readBoundedBody(event)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'BAD_BODY'
    if (code === 'CLIENT_ABORTED') return
    return badRequest(event, code === 'BODY_TOO_LARGE' ? 413 : code === 'BODY_TIMEOUT' ? 408 : 400, code)
  }
  if (rawBody.length > CHAT_LIMITS.bodyChars) return badRequest(event, 413, 'BODY_TOO_LARGE')

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    return badRequest(event, 400, 'BAD_BODY')
  }
  const parsed = chatRequestSchema.safeParse(parsedBody)
  if (!parsed.success) return badRequest(event, 400, 'INVALID_REQUEST')
  const request = parsed.data
  const historyChars = request.history.reduce((total, turn) => total + turn.content.length, 0)
  if (historyChars > CHAT_LIMITS.historyChars) return badRequest(event, 413, 'HISTORY_TOO_LARGE')

  const config = useRuntimeConfig() as { anthropicKey?: string; anthropicApiKey?: string; anthropicModel?: string }
  const apiKey = String(config.anthropicApiKey || config.anthropicKey || process.env.NUXT_ANTHROPIC_API_KEY || process.env.NUXT_ANTHROPIC_KEY || process.env.NUXT_ANT_THROPIC_KEY || '').trim() || undefined
  // A model is opt-in: no historic or future fallback ID is assumed usable.
  const model = String(config.anthropicModel || process.env.NUXT_ANTHROPIC_MODEL || '').trim() || undefined

  const selectorController = new AbortController()
  let disconnected = false
  const onDisconnected = () => {
    disconnected = true
    selectorController.abort()
  }
  event.node.req.once('aborted', onDisconnected)
  event.node.res.once('close', onDisconnected)
  const selectorTimeout = setTimeout(() => selectorController.abort(), SELECTOR_TIMEOUT_MS)

  try {
    const selection = await selectGrounding(request, apiKey, model, selectorController.signal)
    clearTimeout(selectorTimeout)
    if (disconnected) return
    const answer = buildGroundedAnswer(request, selection)
    const sources = getSources(answer.sourceIds)

    setResponseHeaders(event, {
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Telebot-Routing': selection.routing === 'live' ? 'live' : 'catalog',
      'X-Telebot-Offline': selection.routing === 'live' ? '0' : '1',
      Connection: 'keep-alive'
    })
    const response = event.node.res
    const write = (payload: Parameters<typeof encodeSse>[0]) => {
      if (disconnected || response.writableEnded || response.destroyed) return false
      response.write(encodeSse(payload))
      return true
    }

    if (!write({ type: 'meta', mode: request.mode, routing: selection.routing === 'live' ? 'live' : 'catalog' })) return
    for (const tool of selection.tools) {
      if (!write({ type: 'tool', name: tool.name, args: tool.args })) return
    }
    // Bound the answer chunks even though they are deterministic catalog text.
    const text = answer.text.slice(0, CHAT_LIMITS.responseChars)
    for (let index = 0; index < text.length; index += 72) {
      if (!write({ type: 'token', text: text.slice(index, index + 72) })) return
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
    if (!write({ type: 'sources', sources: sources.slice(0, 12).map(source => ({ label: source.label.slice(0, 160), href: source.href })) })) return
    write({ type: 'done' })
  } catch {
    // No prompt, address, provider exception or stack trace is logged/exposed.
    // Once SSE has started, leave it incomplete; the client clears partial
    // text and switches to the same deterministic catalog path.
    if (!disconnected && !event.node.res.headersSent) {
      return badRequest(event, 503, 'CHAT_UNAVAILABLE')
    }
  } finally {
    clearTimeout(selectorTimeout)
    selectorController.abort()
    event.node.req.removeListener('aborted', onDisconnected)
    event.node.res.removeListener('close', onDisconnected)
    if (!event.node.res.writableEnded && !event.node.res.destroyed) event.node.res.end()
  }
})
