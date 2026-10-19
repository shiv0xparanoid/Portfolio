/** Shared chat request/response contracts and SSE validation. */
import { z } from 'zod'
import { isSafeSourceHref } from './content-model'

export const CHAT_MODE_VALUES = ['visitor', 'recruiter'] as const
export type ChatMode = typeof CHAT_MODE_VALUES[number]

export const CHAT_LIMITS = {
  messageChars: 1200,
  historyTurns: 12,
  historyChars: 6000,
  transcriptTurns: 24,
  transcriptChars: 24_000,
  responseChars: 20_000,
  bodyChars: 14_000,
  bodyBytes: 16_384,
  recruiterFieldChars: 160,
  maxResponseTokens: 420,
  clientTimeoutMs: 15_000
} as const

export const recruiterBriefSchema = z.object({
  company: z.string().trim().max(CHAT_LIMITS.recruiterFieldChars).optional().default(''),
  role: z.string().trim().max(CHAT_LIMITS.recruiterFieldChars).optional().default(''),
  need: z.string().trim().max(CHAT_LIMITS.recruiterFieldChars).optional().default('')
})

export const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().max(CHAT_LIMITS.messageChars)
})

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(CHAT_LIMITS.messageChars),
  history: z.array(chatHistoryItemSchema).max(CHAT_LIMITS.historyTurns).optional().default([]),
  mode: z.enum(CHAT_MODE_VALUES).optional().default('visitor'),
  recruiter: recruiterBriefSchema.optional().default({ company: '', role: '', need: '' })
})

export type ChatRequest = z.infer<typeof chatRequestSchema>

export type ChatSource = { label: string; href: string }
export const chatSourceSchema = z.object({
  label: z.string().trim().min(1).max(160),
  href: z.string().trim().max(240).refine(isSafeSourceHref, 'Unsafe source href')
})

export const CHAT_TOOL_NAME_VALUES = [
  'navigate_to_chapter',
  'open_project',
  'play_media',
  'set_channel',
  'set_mood',
  'highlight_metric',
  'schedule_call'
] as const

export const chatToolSchema = z.discriminatedUnion('name', [
  z.object({ name: z.literal('navigate_to_chapter'), args: z.object({ chapter: z.enum(['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'extras']) }) }),
  z.object({ name: z.literal('open_project'), args: z.object({ id: z.string().min(1).max(80) }) }),
  z.object({ name: z.literal('play_media'), args: z.object({ index: z.number().int().min(0).max(63) }) }),
  z.object({ name: z.literal('set_channel'), args: z.object({ channel: z.enum(['idle', 'noise', 'term', 'chapter', 'mood', 'smile', 'face', 'beats', 'scope', 'signal', 'reel', 'project']) }) }),
  z.object({ name: z.literal('set_mood'), args: z.object({ mood: z.enum(['idle', 'thinking', 'speaking', 'happy', 'calm', 'wow', 'sleep']) }) }),
  z.object({ name: z.literal('highlight_metric'), args: z.object({ id: z.string().min(1).max(100) }) }),
  z.object({ name: z.literal('schedule_call'), args: z.object({ chapter: z.literal('ch10') }) })
])
export type ChatToolCall = z.infer<typeof chatToolSchema>

export const chatSseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('meta'), mode: z.enum(CHAT_MODE_VALUES), routing: z.enum(['live', 'catalog']).optional().default('catalog') }),
  z.object({ type: z.literal('token'), text: z.string().max(2000) }),
  z.object({ type: z.literal('sources'), sources: z.array(chatSourceSchema).max(12) }),
  z.object({ type: z.literal('tool'), name: z.enum(CHAT_TOOL_NAME_VALUES), args: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal('done') })
])
export type ChatSseEvent = z.infer<typeof chatSseEventSchema>

export function encodeSse(event: ChatSseEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** Parse complete SSE records, retaining an incomplete trailing record. */
export function consumeSseBuffer(buffer: string): { events: ChatSseEvent[]; rest: string; invalid: number } {
  const events: ChatSseEvent[] = []
  let invalid = 0
  const records = buffer.split(/\r?\n\r?\n/)
  const rest = records.pop() ?? ''
  for (const record of records) {
    const data = record.split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
    if (!data) continue
    if (data === '[DONE]') { events.push({ type: 'done' }); continue }
    try {
      const parsed = chatSseEventSchema.safeParse(JSON.parse(data))
      if (parsed.success) events.push(parsed.data)
      else invalid++
    } catch {
      invalid++
    }
  }
  return { events, rest, invalid }
}

export const ALLOWED_CHAPTERS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'extras'] as const
