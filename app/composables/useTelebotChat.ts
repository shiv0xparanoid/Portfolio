import { computed, getCurrentScope, nextTick, onScopeDispose } from 'vue'
import { useNuxtApp, useRouter, useState } from '#imports'
import { useTelebot } from '~/composables/useTelebot'
import { usePortfolioContent } from '~/composables/usePortfolioContent'
import {
  CHAT_LIMITS,
  chatRequestSchema,
  chatSourceSchema,
  chatToolSchema,
  consumeSseBuffer,
  type ChatMode,
  type ChatRequest,
  type ChatSource,
  type ChatToolCall
} from '~~/shared/chat'
import {
  buildDeterministicGrounding,
  buildSourceCatalog,
  isUsableMediaItem
} from '~~/shared/content-model'

export type ChatTurn = {
  id: number
  role: 'user' | 'assistant'
  text: string
  sources: ChatSource[]
  tools: ChatToolCall[]
  finished: boolean
  offline?: boolean
  cancelled?: boolean
}

type ChatStatus = 'idle' | 'pending' | 'error' | 'cancelled' | 'waiting'
type ChatRouting = 'unknown' | 'live' | 'catalog'
type ChatSession = {
  status: ChatStatus
  mode: ChatMode
  error: string
  recruiter: { company: string; role: string; need: string }
  turns: ChatTurn[]
  nextId: number
  routing: ChatRouting
  retryUntil: number
}

const CHIPS = [
  'What has he shipped?',
  'Show startup results',
  'What do collaborators say?',
  'Explain his research simply',
  'Can I hire him?'
] as const
const GREETING = 'Hi — I’m MEG. Ask about the current project records, startup case files, research, or how to connect. I cite the portfolio content and say plainly when I don’t know.'

function initialSession(): ChatSession {
  return {
    status: 'idle', mode: 'visitor', error: '', recruiter: { company: '', role: '', need: '' },
    turns: [{ id: 1, role: 'assistant', text: GREETING, sources: [], tools: [], finished: true }],
    nextId: 2, routing: 'unknown', retryUntil: 0
  }
}

/**
 * All serializable conversation state belongs to useState, so SSR requests
 * cannot share a transcript. The browser runtime (controllers/timers/methods)
 * belongs only to this Nuxt app and is never put into the hydration payload.
 */
function createChatRuntime() {
  const session = useState<ChatSession>('telebot-chat-session', initialSession)
  const content = usePortfolioContent()
  const telebot = useTelebot()
  const router = useRouter()
  const sourceCatalog = buildSourceCatalog(content)
  const sourceByHref = new Map(sourceCatalog.map(source => [source.href, source]))
  const media = content.media.items.filter(isUsableMediaItem)
  let activeController: AbortController | null = null
  let activeTurnId: number | null = null
  let consumers = 0

  const currentTurn = (id: number) => session.value.turns.find(turn => turn.id === id)

  function makeTurn(role: ChatTurn['role'], text = '', finished = role === 'user'): ChatTurn {
    return { id: session.value.nextId++, role, text, sources: [], tools: [], finished }
  }

  function boundTranscript() {
    const turns = session.value.turns
    while (turns.length > CHAT_LIMITS.transcriptTurns) turns.splice(0, 1)
    while (turns.length > 2 && turns.reduce((total, turn) => total + turn.text.length, 0) > CHAT_LIMITS.transcriptChars) turns.splice(0, 1)
  }

  function appendToken(id: number, text: string) {
    const turn = currentTurn(id)
    if (!turn || turn.finished) return
    if (turn.text.length + text.length > CHAT_LIMITS.responseChars) throw new Error('ANSWER_TOO_LARGE')
    // Get the Vue proxy out of the reactive array, not the raw object originally
    // passed to push(), so every arriving token invalidates both chat surfaces.
    turn.text += text
    telebot.streamText(text)
  }

  function clearAnswer(id: number) {
    const turn = currentTurn(id)
    if (!turn) return
    turn.text = ''
    turn.sources = []
    turn.tools = []
    turn.offline = undefined
    telebot.clearText()
  }

  function finish(id: number, status: ChatStatus = 'idle') {
    const turn = currentTurn(id)
    if (turn) turn.finished = true
    session.value.status = status
    telebot.setMood('idle')
    if (turn?.text) telebot.setChannel('term')
    boundTranscript()
  }

  function checkedSources(sources: ChatSource[]): ChatSource[] {
    return sources.map(item => chatSourceSchema.safeParse(item))
      .filter(parsed => parsed.success)
      .map(parsed => parsed.data)
      .filter(item => sourceByHref.has(item.href))
      .map(item => ({ label: item.label, href: item.href.startsWith('#') ? `/${item.href}` : item.href }))
  }

  function explicitNavigationIntent(value: string): boolean {
    return /\b(show|go|open|take me|navigate|scroll|jump|view|where can i see)\b/i.test(value)
  }

  function validateTool(value: unknown, request: ChatRequest): ChatToolCall | null {
    const parsed = chatToolSchema.safeParse(value)
    if (!parsed.success) return null
    const tool = parsed.data
    const canNavigate = explicitNavigationIntent(request.message)
    if (tool.name === 'navigate_to_chapter' && !canNavigate) return null
    if (tool.name === 'open_project' && (!canNavigate || !content.projects.some(project => project.id === tool.args.id))) return null
    if (tool.name === 'highlight_metric' && (!canNavigate || !content.impact.some(metric => !metric.isPlaceholder && metric.id === tool.args.id))) return null
    if (tool.name === 'play_media' && tool.args.index >= media.length) return null
    if (tool.name === 'schedule_call' && !/\b(schedule|book|calendar|meeting|call)\b/i.test(request.message)) return null
    return tool
  }

  async function navigateChapter(chapter: string) {
    if (import.meta.server) return
    const href = `/#${chapter}`
    if (router.currentRoute.value.path !== '/') {
      await router.push(href)
      await nextTick()
    }
    const target = document.getElementById(chapter)
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  async function runTool(tool: ChatToolCall) {
    if (import.meta.server) return
    if (tool.name === 'navigate_to_chapter') { await navigateChapter(tool.args.chapter); return }
    if (tool.name === 'open_project') {
      telebot.setProjectPreview(tool.args.id)
      await router.push(`/projects/${tool.args.id}`)
      return
    }
    if (tool.name === 'play_media') { telebot.setProjectPreview(null); telebot.playMedia(tool.args.index); return }
    if (tool.name === 'highlight_metric') {
      await navigateChapter('ch6')
      await nextTick()
      // The current Impact component prints the actual ID in each row. Prefer
      // an explicit DOM ID/data attribute if supplied, otherwise match that
      // printed ID rather than highlighting the entire chapter blindly.
      const target = document.getElementById(tool.args.id)
        || document.getElementById(`metric-${tool.args.id}`)
        || Array.from(document.querySelectorAll<HTMLElement>('#ch6 [data-metric-id]')).find(item => item.dataset.metricId === tool.args.id)
        || Array.from(document.querySelectorAll<HTMLElement>('#ch6 .impact__item')).find(item => item.querySelector('.impact__index')?.textContent?.trim() === tool.args.id)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        target.animate?.([
          { outline: '3px solid var(--accent)', background: 'color-mix(in oklab, var(--accent) 20%, transparent)' },
          { outline: '3px solid transparent', background: 'transparent' }
        ], { duration: 1800 })
      }
      return
    }
    if (tool.name === 'schedule_call') { await navigateChapter('ch10'); return }
    if (tool.name === 'set_channel') telebot.setChannel(tool.args.channel)
    if (tool.name === 'set_mood') telebot.setMood(tool.args.mood)
  }

  function renderFallback(id: number, request: ChatRequest) {
    const answer = buildDeterministicGrounding(content, request)
    const turn = currentTurn(id)
    if (!turn) return
    // Never append a saved answer to a partial provider stream.
    clearAnswer(id)
    turn.offline = true
    session.value.routing = 'catalog'
    const ids = new Set(answer.sourceIds)
    const sources = sourceCatalog.filter(source => ids.has(source.id))
    const text = `${answer.text}${sources.length ? `\n\n↪ Sources: ${sources.map(source => `${source.label} (${source.href.startsWith('#') ? `/${source.href}` : source.href})`).join(' · ')}` : ''}`
    appendToken(id, text.slice(0, CHAT_LIMITS.responseChars))
    turn.sources = checkedSources(sources.map(source => ({ label: source.label, href: source.href })))
    turn.tools = answer.tools.map(tool => validateTool(tool, request)).filter((tool): tool is ChatToolCall => Boolean(tool))
    finish(id, 'error')
  }

  async function readStream(response: Response, id: number, request: ChatRequest, signal: AbortSignal) {
    if (!response.body) throw new Error('NO_STREAM')
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: true })
    let buffer = ''
    let bytes = 0
    let receivedToken = false
    let receivedDone = false
    const queuedTools: ChatToolCall[] = []
    const onAbort = () => { void reader.cancel().catch(() => {}) }
    signal.addEventListener('abort', onAbort, { once: true })
    const process = (record: ReturnType<typeof consumeSseBuffer>) => {
      if (record.invalid) throw new Error('INVALID_STREAM')
      buffer = record.rest
      for (const event of record.events) {
        if (receivedDone) throw new Error('AFTER_DONE')
        if (event.type === 'meta') session.value.routing = event.routing
        if (event.type === 'token') { receivedToken = receivedToken || Boolean(event.text); appendToken(id, event.text) }
        if (event.type === 'sources') {
          const turn = currentTurn(id)
          if (turn) turn.sources = checkedSources(event.sources)
        }
        if (event.type === 'tool') {
          const validated = validateTool(event, request)
          if (validated && queuedTools.length < 4) queuedTools.push(validated)
        }
        if (event.type === 'done') receivedDone = true
      }
    }
    try {
      while (!receivedDone) {
        const { done, value } = await reader.read()
        if (signal.aborted) throw new Error('ABORTED')
        bytes += value?.byteLength || 0
        if (bytes > CHAT_LIMITS.responseChars * 8) throw new Error('STREAM_TOO_LARGE')
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        if (buffer.length > CHAT_LIMITS.responseChars * 2) throw new Error('RECORD_TOO_LARGE')
        process(consumeSseBuffer(buffer))
        if (done) {
          if (buffer.trim()) process(consumeSseBuffer(`${buffer}\n\n`))
          break
        }
      }
      if (!receivedDone || !receivedToken) throw new Error('INCOMPLETE_STREAM')
      const turn = currentTurn(id)
      if (turn) turn.tools = queuedTools
    } finally {
      signal.removeEventListener('abort', onAbort)
      await reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  }

  function historyForRequest(): ChatRequest['history'] {
    const turns = session.value.turns.filter(turn => turn.finished && !turn.cancelled).slice(-CHAT_LIMITS.historyTurns)
    const history: ChatRequest['history'] = []
    let remaining = CHAT_LIMITS.historyChars
    for (const turn of turns.reverse()) {
      const text = turn.text.slice(0, Math.min(CHAT_LIMITS.messageChars, remaining))
      if (!text) continue
      history.unshift({ role: turn.role, content: text })
      remaining -= text.length
      if (!remaining) break
    }
    return history
  }

  async function send(message?: string) {
    if (import.meta.server) return
    const text = (message ?? '').trim()
    if (!text || session.value.status === 'pending') return
    if (Date.now() < session.value.retryUntil) {
      const seconds = Math.ceil((session.value.retryUntil - Date.now()) / 1000)
      session.value.status = 'waiting'
      session.value.error = `Please wait ${seconds} second(s) before sending another question.`
      return
    }
    const parsed = chatRequestSchema.safeParse({ message: text, history: historyForRequest(), mode: session.value.mode, recruiter: session.value.recruiter })
    if (!parsed.success) {
      session.value.error = `Keep the question under ${CHAT_LIMITS.messageChars} characters and brief fields under ${CHAT_LIMITS.recruiterFieldChars}.`
      session.value.status = 'error'
      return
    }
    const request = parsed.data
    session.value.error = ''
    session.value.status = 'pending'
    const answerId = session.value.nextId + 1
    session.value.turns.push(makeTurn('user', text), makeTurn('assistant'))
    boundTranscript()
    telebot.clearText()
    telebot.setMood('thinking')
    const controller = new AbortController()
    activeController = controller
    activeTurnId = answerId
    let timedOut = false
    const timeout = setTimeout(() => { timedOut = true; controller.abort() }, CHAT_LIMITS.clientTimeoutMs)
    const pageHide = () => cancel()
    window.addEventListener('pagehide', pageHide, { once: true })
    try {
      const response = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(request), signal: controller.signal
      })
      if (activeController !== controller) return
      if (response.status === 429) {
        const wait = Math.min(3600, Math.max(1, Number(response.headers.get('retry-after')) || 60))
        session.value.retryUntil = Date.now() + wait * 1000
        session.value.error = `Please wait ${wait} second(s) before sending another question.`
        clearAnswer(answerId)
        appendToken(answerId, session.value.error)
        finish(answerId, 'waiting')
        return
      }
      if (!response.ok) throw new Error('HTTP_ERROR')
      await readStream(response, answerId, request, controller.signal)
      if (activeController !== controller) return
      const answer = currentTurn(answerId)
      if (answer) answer.offline = session.value.routing !== 'live' || undefined
      finish(answerId)
    } catch {
      if (activeController !== controller) return
      if (controller.signal.aborted && !timedOut) {
        const answer = currentTurn(answerId)
        clearAnswer(answerId)
        if (answer) answer.cancelled = true
        finish(answerId, 'cancelled')
        return
      }
      session.value.error = timedOut ? 'The request timed out. Showing the saved catalog answer.' : 'Live routing is unavailable. Showing the saved catalog answer.'
      renderFallback(answerId, request)
    } finally {
      clearTimeout(timeout)
      window.removeEventListener('pagehide', pageHide)
      if (activeController === controller) {
        activeController = null
        activeTurnId = null
      }
    }
    const answer = currentTurn(answerId)
    if (!answer?.finished || answer.cancelled) return
    // Execute validated actions only after an entire reply reached its done
    // marker. Broken or cancelled streams cannot navigate halfway through.
    for (const tool of answer.tools) {
      try { await runTool(tool) } catch { /* Navigation failure does not alter portfolio facts. */ }
    }
    if (answer.text) { telebot.setMood('idle'); telebot.setChannel('term') }
  }

  function cancel() {
    const id = activeTurnId
    activeController?.abort()
    activeController = null
    activeTurnId = null
    if (id !== null) {
      const turn = currentTurn(id)
      clearAnswer(id)
      if (turn) { turn.cancelled = true; turn.finished = true }
    }
    session.value.status = 'cancelled'
    telebot.setMood('idle')
  }

  function reset() {
    cancel()
    session.value.error = ''
    session.value.status = 'idle'
    session.value.mode = 'visitor'
    session.value.recruiter = { company: '', role: '', need: '' }
    session.value.turns.splice(0, session.value.turns.length, makeTurn('assistant', GREETING, true))
    telebot.clearText()
  }

  return {
    turns: computed(() => session.value.turns),
    status: computed(() => session.value.status),
    pending: computed(() => session.value.status === 'pending'),
    error: computed(() => session.value.error),
    routing: computed(() => session.value.routing),
    routingLabel: computed(() => session.value.routing === 'live' ? 'Live routing · catalog-grounded answers' : session.value.routing === 'catalog' ? 'Saved catalog mode' : 'Routing checked when you ask'),
    mode: computed({ get: () => session.value.mode, set: value => { session.value.mode = value } }),
    recruiter: session.value.recruiter,
    chips: CHIPS, send, cancel, reset,
    isSafeSource: (href: string) => chatSourceSchema.safeParse({ label: 'Source', href }).success && (sourceByHref.has(href) || sourceByHref.has(href.replace(/^\/#/, '#'))),
    retain() { consumers++ },
    release() { consumers = Math.max(0, consumers - 1); if (!consumers && activeController) cancel() }
  }
}

type ChatRuntime = ReturnType<typeof createChatRuntime>

export function useTelebotChat() {
  const app = useNuxtApp() as ReturnType<typeof useNuxtApp> & { _telebotChat?: ChatRuntime }
  const runtime = app._telebotChat || (app._telebotChat = createChatRuntime())
  if (getCurrentScope()) {
    runtime.retain()
    onScopeDispose(() => runtime.release())
  }
  return runtime
}
