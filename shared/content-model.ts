/**
 * Shared, pure content helpers.  This file has no Nuxt, server, DOM, or
 * browser dependency and can be used by both the client composable and Nitro.
 */
import { z } from 'zod'
import type { PortfolioContent, SourceCitation } from '../types/content'
import type { ChatRequest, ChatToolCall } from './chat'

export const PLACEHOLDER_RE = /^\[PLACEHOLDER(?:\s|—|-|\])/i

export function isPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && (PLACEHOLDER_RE.test(value.trim()) || value.includes('[PLACEHOLDER'))
}

const SAFE_CHAPTER_HREF = /^\/#(?:ch(?:[1-9]|10)|extras)$/
const SAFE_ANCHOR_HREF = /^#(?:ch(?:[1-9]|10)|extras)$/
const SAFE_PROJECT_HREF = /^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/i

/**
 * Chat citations are an intentionally tiny internal allowlist.  A leading
 * slash is not enough: protocol-relative URLs and arbitrary application
 * routes must never become links emitted by the model or rendered by chat.
 */
export function isSafeSourceHref(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.startsWith('//')) return false
  const href = value.trim()
  return SAFE_ANCHOR_HREF.test(href) || SAFE_CHAPTER_HREF.test(href) || href === '/' || SAFE_PROJECT_HREF.test(href)
}

export function isUsableHref(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || isPlaceholder(value)) return false
  if (value.startsWith('//')) return false
  return isSafeSourceHref(value) || (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value)
}

const verification = z.enum(['confirmed', 'owner-reported-awaiting-source', 'placeholder']).optional()
const link = z.object({
  label: z.string(),
  href: z.string(),
  confirmNeeded: z.boolean().optional(),
  verification,
  sourceId: z.string().optional()
})
const mediaItem = z.object({
  id: z.string().optional(),
  type: z.enum(['image', 'video', 'webgl']),
  src: z.string(),
  alt: z.string(),
  poster: z.string().optional(),
  confirmNeeded: z.boolean().optional(),
  verification,
  projectId: z.string().optional()
})
const outcome = z.object({
  metric: z.string(), before: z.string(), after: z.string(), verification, source: z.string().optional()
})

export const bioSchema = z.object({
  name: z.string(), role: z.string(), tagline: z.string(), one_sentence: z.string(),
  adjectives: z.tuple([z.string(), z.string(), z.string()]), photo_artifact: z.string(),
  timeline: z.array(z.object({
    year: z.string(), label: z.string(), kind: z.enum(['education', 'projects', 'project', 'future']),
    note: z.string(), verification
  })),
  research_focus: z.array(z.object({ label: z.string(), why: z.string(), verification })),
  originLines: z.array(z.string()), verification
})

export const startupSchema = z.object({
  id: z.string(), name: z.string(), displayName: z.string(), years: z.string(), role: z.string(),
  problem: z.string(), bet: z.string(), whatBuilt: z.string(), technology: z.array(z.string()),
  traction: z.array(z.object({ metric: z.string(), value: z.string(), verification, source: z.string().optional() })),
  learned: z.string(), status: z.enum(['live', 'exited', 'shut']), statusLabel: z.string(),
  links: z.object({ website: z.string(), github: z.string() }), verification
})

export const projectSchema = z.object({
  id: z.string(), prjctId: z.string(), title: z.string(), subtitle: z.string().optional(), year: z.string(),
  yearSort: z.number(), role: z.string(), type: z.string(), scope: z.string(), stack: z.array(z.string()),
  problem: z.string(), solution: z.string(), keyDecisions: z.tuple([z.string(), z.string(), z.string()]),
  outcome, links: z.array(link), media: z.array(mediaItem),
  testimonial: z.object({ quote: z.string(), name: z.string(), role: z.string() }).nullable(), verification
})

export const researchSchema = z.object({
  published: z.array(z.object({
    id: z.string(), title: z.string(), year: z.string(), venue: z.string(), plain_summary: z.string(),
    so_what: z.string(), result: z.string(), links: z.array(link), isPublished: z.literal(true), verification
  })),
  focusAreas: z.array(z.object({ label: z.string(), why: z.string(), tags: z.array(z.string()), links: z.array(link), verification }))
})

export const impactSchema = z.array(z.object({
  id: z.string(), metric: z.string(), value: z.string(),
  counter: z.object({ start: z.number(), end: z.number(), prefix: z.string().optional(), suffix: z.string().optional() }).nullable(),
  before: z.string(), after: z.string(), context: z.string(), source: z.string(), isPlaceholder: z.boolean().optional(),
  verification, sourceId: z.string().optional(), _template: z.boolean().optional()
}))

export const testimonialsSchema = z.object({
  items: z.array(z.object({ id: z.string(), quote: z.string(), name: z.string(), role: z.string(), company: z.string(), photo: z.string(), link: z.string(), verification, _template: z.boolean().optional() })),
  threeWordDescriptors: z.array(z.object({ from: z.string(), words: z.tuple([z.string(), z.string(), z.string()]) })),
  honestyNote: z.string()
})
export const awardsSchema = z.object({
  items: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), year: z.string(), venue: z.string(), link: z.string(), verification, _template: z.boolean().optional() })),
  counterTotal: z.number(), honestyNote: z.string()
})
export const musicSchema = z.object({
  tracks: z.array(z.object({ id: z.string(), title: z.string(), meta: z.string().optional(), verification })).length(3),
  soundcloud: link,
  honestyNote: z.string().optional()
})
export const pressSchema = z.object({ items: z.array(z.object({ id: z.string(), headline: z.string(), outlet: z.string(), date: z.string(), link: z.string(), verification, _template: z.boolean().optional() })) })
export const talksSchema = z.object({ items: z.array(z.object({ id: z.string(), title: z.string(), event: z.string(), city: z.string(), year: z.string(), slides: z.string(), recording: z.string(), verification, _template: z.boolean().optional() })) })
export const contactSchema = z.object({
  email: z.string(), timezone: z.string(), location: z.string().optional(),
  socials: z.array(z.object({ id: z.string(), label: z.string(), href: z.string(), confirmNeeded: z.boolean().optional(), verification })),
  availability: z.object({ status: z.string(), responseTime: z.string() }), verification
})
const capabilityBuildSchema = z.object({ title: z.string(), detail: z.string(), href: z.string().optional() })
export const capabilitiesSchema = z.array(z.object({
  id: z.string(),
  group: z.string(),
  label: z.string(),
  built: z.array(capabilityBuildSchema).optional(),
  verification
}))
export const mediaSchema = z.object({ items: z.array(mediaItem), honestyNote: z.string().optional() })

export const portfolioContentSchema = z.object({
  bio: bioSchema,
  capabilities: capabilitiesSchema,
  startups: z.array(startupSchema),
  projects: z.array(projectSchema),
  research: researchSchema,
  impact: impactSchema,
  testimonials: testimonialsSchema,
  awards: awardsSchema,
  music: musicSchema,
  press: pressSchema,
  talks: talksSchema,
  contact: contactSchema,
  media: mediaSchema
})

export function parsePortfolioContent(value: unknown): PortfolioContent {
  return portfolioContentSchema.parse(value) as PortfolioContent
}

/** A media item is actionable only when its path is real enough to load. */
export function isUsableMediaItem(value: PortfolioContent['media']['items'][number] | unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const item = value as PortfolioContent['media']['items'][number]
  if (!['image', 'video'].includes(item.type) || item.confirmNeeded || item.verification === 'placeholder') return false
  if (isPlaceholder(item.src) || typeof item.src !== 'string' || !item.src.trim() || item.src.startsWith('//')) return false
  return /^https?:\/\//i.test(item.src) || item.src.startsWith('/')
}

/** Build a safe source map from known content. External placeholders are excluded. */
export function buildSourceCatalog(content: PortfolioContent): SourceCitation[] {
  const sources: SourceCitation[] = [
    { id: 'bio.hero', label: 'Hero · identity and pitch', href: '/#ch1', chapter: 'ch1' },
    { id: 'bio.origin', label: 'Origin · five-line story', href: '/#ch2', chapter: 'ch2' },
    { id: 'bio.capabilities', label: 'Capabilities · tools and focus', href: '/#ch3', chapter: 'ch3' },
    { id: 'startups.index', label: 'Ventures · startup case files', href: '/#ch4', chapter: 'ch4' },
    { id: 'research.index', label: 'Research · writing and focus areas', href: '/#ch5', chapter: 'ch5' },
    { id: 'impact.index', label: 'Impact · owner-reported milestones', href: '/#ch6', chapter: 'ch6' },
    { id: 'projects.index', label: 'Work · project index', href: '/#ch7', chapter: 'ch7' },
    { id: 'people.index', label: 'People · testimonials and recognition', href: '/#ch8', chapter: 'ch8' },
    { id: 'ask.index', label: 'Ask · grounded assistant', href: '/#ch9', chapter: 'ch9' },
    { id: 'contact.index', label: 'Contact · ways to connect', href: '/#ch10', chapter: 'ch10' },
    { id: 'media.index', label: 'Media · portfolio assets', href: '/#extras', chapter: 'extras' }
  ]
  for (const project of content.projects) {
    sources.push({ id: `project.${project.id}`, label: `Work · ${project.title}`, href: `/projects/${project.id}`, chapter: 'ch7' })
  }
  for (const startup of content.startups) {
    sources.push({ id: `startup.${startup.id}`, label: `Venture · ${startup.displayName}`, href: '#ch4', chapter: 'ch4' })
  }
  for (const item of content.research.published) {
    sources.push({ id: `research.${item.id}`, label: `Research · ${item.title}`, href: '#ch5', chapter: 'ch5' })
  }
  for (const item of content.impact.filter(item => !item.isPlaceholder)) {
    sources.push({ id: `impact.${item.id}`, label: `Impact · ${item.metric}`, href: '#ch6', chapter: 'ch6' })
  }
  for (const item of content.testimonials.items.filter(item => !item._template)) {
    sources.push({ id: `testimonial.${item.id}`, label: `Testimonial · ${item.name}`, href: '#ch8', chapter: 'ch8' })
  }
  for (const item of content.awards.items.filter(item => !item._template)) {
    sources.push({ id: `award.${item.id}`, label: `Recognition · ${item.name}`, href: '#ch8', chapter: 'ch8' })
  }
  for (const item of content.press.items.filter(item => !item._template)) {
    sources.push({ id: `press.${item.id}`, label: `Press · ${item.outlet}`, href: '#ch8', chapter: 'ch8' })
  }
  for (const item of content.talks.items.filter(item => !item._template)) {
    sources.push({ id: `talk.${item.id}`, label: `Talk · ${item.event}`, href: '#ch8', chapter: 'ch8' })
  }
  return sources
}

export type GroundingTopic = 'identity' | 'shipped' | 'startup' | 'research' | 'people' | 'impact' | 'contact' | 'recruiter' | 'unknown'

export type DeterministicGrounding = {
  topic: GroundingTopic
  sourceIds: string[]
  tools: ChatToolCall[]
  text: string
}

function lower(value: string): string {
  return value.toLocaleLowerCase('en-US')
}

function explicitNavigationIntent(value: string): boolean {
  return /\b(show|go|open|take me|navigate|scroll|jump|view|where can i see)\b/i.test(value)
}

function explicitScheduleIntent(value: string): boolean {
  return /\b(schedule|book|calendar|meeting|call)\b/i.test(value)
}

export function classifyGroundingTopic(request: ChatRequest): GroundingTopic {
  if (request.mode === 'recruiter') return 'recruiter'
  const q = lower(request.message)
  if (/\b(startup|venture|holopad|traction)\b/.test(q)) return 'startup'
  if (/\b(shipped|project|built|work|case stud|prototype)\b/.test(q)) return 'shipped'
  if (/\b(research|paper|write|rag|bert|bart|swin|depth|publication|medium)\b/.test(q)) return 'research'
  if (/\b(collaborator|testimonial|people|award|press|talk|said|social proof)\b/.test(q)) return 'people'
  if (/\b(impact|metric|rank|number|users|revenue|result|outcome)\b/.test(q)) return 'impact'
  if (/\b(contact|email|reach|hire|available|connect)\b/.test(q)) return 'contact'
  if (/\b(who|you|name|about|experience|bio|origin|background|capabilit|stack|technology)\b/.test(q)) return 'identity'
  return 'unknown'
}

function sourceIdsForTopic(content: PortfolioContent, topic: GroundingTopic): string[] {
  const sourceIds = buildSourceCatalog(content).map(source => source.id)
  const byPrefix = (prefix: string) => sourceIds.filter(id => id.startsWith(prefix))
  switch (topic) {
    case 'identity': return ['bio.hero', 'bio.origin', 'bio.capabilities'].filter(id => sourceIds.includes(id))
    case 'shipped': return ['projects.index', ...byPrefix('project.')].filter(id => sourceIds.includes(id))
    case 'startup': return ['startups.index', ...byPrefix('startup.')].filter(id => sourceIds.includes(id))
    case 'research': return ['research.index', 'bio.capabilities', ...byPrefix('research.')].filter(id => sourceIds.includes(id))
    case 'people': return ['people.index', ...byPrefix('testimonial.'), ...byPrefix('award.'), ...byPrefix('press.'), ...byPrefix('talk.')].filter(id => sourceIds.includes(id))
    case 'impact': return ['impact.index', ...byPrefix('impact.')].filter(id => sourceIds.includes(id))
    case 'contact': return ['contact.index'].filter(id => sourceIds.includes(id))
    case 'recruiter': return ['projects.index', 'bio.capabilities', ...byPrefix('project.')].filter(id => sourceIds.includes(id))
    case 'unknown': return ['contact.index'].filter(id => sourceIds.includes(id))
  }
}

function publicContactSummary(content: PortfolioContent): string {
  const contact = content.contact
  const email = !isPlaceholder(contact.email) && contact.verification !== 'placeholder' ? contact.email : ''
  const socials = contact.socials
    .filter(link => !link.confirmNeeded && link.verification !== 'placeholder' && isUsableHref(link.href))
    .map(link => `${link.label}: ${link.href}`)
  const availability = !isPlaceholder(contact.availability.status) && contact.verification !== 'placeholder'
    ? `${contact.availability.status}${isPlaceholder(contact.availability.responseTime) ? '' : `; ${contact.availability.responseTime}`}`
    : ''
  if (!email && !socials.length && !availability) return 'Contact details are not confirmed in the current portfolio record. The Contact chapter is the right place to check for newly supplied details; no call is booked by this assistant.'
  const parts = [email ? `Email: ${email}` : '', socials.length ? `Confirmed links: ${socials.join(' · ')}` : '', availability ? `Availability: ${availability}` : ''].filter(Boolean)
  return `Current confirmed contact record: ${parts.join(' · ')}. No call is booked by this assistant.`
}

function projectLine(project: PortfolioContent['projects'][number]): string {
  return `${project.prjctId} ${project.title} — ${project.type}; role: ${project.role}. ${project.solution} ↗ /projects/${project.id}`
}

function projectTokens(project: PortfolioContent['projects'][number]): Set<string> {
  return new Set(lower(`${project.title} ${project.type} ${project.scope} ${project.stack.join(' ')} ${project.solution}`).split(/[^a-z0-9]+/).filter(token => token.length > 2))
}

function recruiterMatches(content: PortfolioContent, request: ChatRequest) {
  const brief = request.recruiter ?? { company: '', role: '', need: '' }
  const wanted = lower(`${brief.role} ${brief.need}`).split(/[^a-z0-9]+/).filter(token => token.length > 2)
  return content.projects
    .map(project => ({ project, score: wanted.reduce((score, token) => score + (projectTokens(project).has(token) ? 1 : 0), 0) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.project.yearSort - a.project.yearSort)
    .map(item => item.project)
}

function topicText(content: PortfolioContent, request: ChatRequest, topic: GroundingTopic): string {
  switch (topic) {
    case 'shipped':
      return content.projects.length
        ? `The current record has ${content.projects.length} project record(s):\n${content.projects.map(projectLine).join('\n')}\n\nThe records describe direction and decisions. Outcomes and confirmed URLs remain marked [PLACEHOLDER] where a source is pending.`
        : 'I do not have a populated project record yet.'
    case 'startup': {
      if (!content.startups.length) return 'I do not have a populated startup case file yet.'
      return content.startups.map(startup => `${startup.displayName}: ${startup.role}, ${startup.years}, currently “${startup.statusLabel}”. ${startup.whatBuilt} Traction is shown only with its recorded verification status.`).join('\n\n')
    }
    case 'research': {
      const published = content.research.published
      const focus = content.research.focusAreas.map(item => item.label).join(', ')
      if (!published.length && !focus) return 'I do not have a populated research record yet.'
      const papers = published.map(piece => `Published record: “${piece.title}” — ${piece.plain_summary} So what? ${piece.so_what}`).join('\n')
      return `${papers}${papers && focus ? '\n' : ''}${focus ? `Focus areas (not additional publications): ${focus}.` : ''}`
    }
    case 'people': {
      const testimonials = content.testimonials.items.filter(item => !item._template && !isPlaceholder(item.quote) && !isPlaceholder(item.name))
      const awards = content.awards.items.filter(item => !item._template && !isPlaceholder(item.name))
      const press = content.press.items.filter(item => !item._template && !isPlaceholder(item.headline))
      const talks = content.talks.items.filter(item => !item._template && !isPlaceholder(item.title))
      const lines = [
        testimonials.length ? `Testimonials (${testimonials.length}): ${testimonials.map(item => `“${item.quote}” — ${item.name}${item.company ? `, ${item.company}` : ''}`).join(' · ')}` : '',
        awards.length ? `Recognition (${awards.length}): ${awards.map(item => `${item.name} (${item.year})`).join(' · ')}` : '',
        press.length ? `Press (${press.length}): ${press.map(item => `${item.headline} — ${item.outlet}`).join(' · ')}` : '',
        talks.length ? `Talks (${talks.length}): ${talks.map(item => `${item.title} — ${item.event}`).join(' · ')}` : ''
      ].filter(Boolean)
      return lines.length ? lines.join('\n') : 'There are no confirmed testimonials, awards, press items, or talks in the current portfolio record. I will not invent social proof.'
    }
    case 'impact': {
      const metrics = content.impact.filter(item => !item.isPlaceholder && !item._template)
      return metrics.length
        ? `The impact wall has ${metrics.length} owner-reported record(s): ${metrics.map(item => `${item.metric}: ${item.value}`).join('; ')}. These records are not presented as independently verified.`
        : 'No sourced impact metrics are populated yet; numeric placeholders stay hidden.'
    }
    case 'contact': return publicContactSummary(content)
    case 'recruiter': {
      const brief = request.recruiter ?? { company: '', role: '', need: '' }
      const matches = recruiterMatches(content, request)
      const proof = matches.length
        ? `Direct record matches:\n${matches.map(projectLine).join('\n')}`
        : `I do not have a confirmed direct project match for ${brief.role || brief.need || 'that brief'} in the current record. No fit is claimed without a matching entry.`
      return `Recruiter view for ${brief.company || '[company not provided]'}${brief.role ? ` · ${brief.role}` : ''}${brief.need ? ` · need: ${brief.need}` : ''}:\n${proof}\n\nThis is a grounded starting point, not a guaranteed fit. Confirmed outcomes, contact details, and social proof remain [PLACEHOLDER] until supplied.`
    }
    case 'identity':
      return `I’m MEG for ${content.bio.name}. ${content.bio.one_sentence} ${content.bio.originLines[0] || ''}`.trim()
    case 'unknown':
    default:
      return 'I don’t know that from the current portfolio record. I will not make up a fact; the Contact chapter is available if you want to ask the owner directly.'
  }
}

function deterministicTools(content: PortfolioContent, request: ChatRequest, topic: GroundingTopic): ChatToolCall[] {
  const q = lower(request.message)
  const tools: ChatToolCall[] = []
  const explicitNavigation = explicitNavigationIntent(q)
  const chapterByTopic: Partial<Record<GroundingTopic, ChatToolCall['args']>> = {
    identity: { chapter: 'ch1' }, shipped: { chapter: 'ch7' }, startup: { chapter: 'ch4' }, research: { chapter: 'ch5' },
    people: { chapter: 'ch8' }, impact: { chapter: 'ch6' }, contact: { chapter: 'ch10' }, recruiter: { chapter: 'ch7' }, unknown: { chapter: 'ch10' }
  }
  if (explicitNavigation && chapterByTopic[topic]) tools.push({ name: 'navigate_to_chapter', args: chapterByTopic[topic]! } as ChatToolCall)
  const project = content.projects.find(item => q.includes(lower(item.id)) || q.includes(lower(item.title)))
  if (project && explicitNavigation && /\b(open|go|show|view|see)\b/.test(q)) tools.push({ name: 'open_project', args: { id: project.id } })
  if (explicitNavigation && topic === 'impact') {
    const metric = content.impact.find(item => !item.isPlaceholder && (q.includes(lower(item.id)) || q.includes(lower(item.metric))))
    if (metric) tools.push({ name: 'highlight_metric', args: { id: metric.id } })
  }
  if (/\b(play|watch|media|reel)\b/.test(q) && content.media.items.some(isUsableMediaItem)) tools.push({ name: 'play_media', args: { index: 0 } })
  if (explicitScheduleIntent(q)) tools.push({ name: 'schedule_call', args: { chapter: 'ch10' } })
  return tools.slice(0, 4)
}

/**
 * Build the saved answer path from the validated current content.  It is pure
 * and shared by Nitro and the browser, so an offline answer cannot drift into
 * hardcoded counts or facts that are no longer in the portfolio.
 */
export function buildDeterministicGrounding(content: PortfolioContent, request: ChatRequest, forcedTopic?: GroundingTopic): DeterministicGrounding {
  const topic = forcedTopic || classifyGroundingTopic(request)
  return {
    topic,
    sourceIds: sourceIdsForTopic(content, topic),
    tools: deterministicTools(content, request, topic),
    text: topicText(content, request, topic)
  }
}
