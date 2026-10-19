/**
 * Canonical portfolio content contracts.
 *
 * The editable source lives in /content.  The legacy /data directory is kept
 * intact for reference and is deliberately not imported by the application.
 */

export type VerificationStatus =
  | 'confirmed'
  | 'owner-reported-awaiting-source'
  | 'placeholder'

export type LinkItem = {
  label: string
  href: string
  /** Placeholder links are rendered as copy, never as an external action. */
  confirmNeeded?: boolean
  verification?: VerificationStatus
  sourceId?: string
}

export type MediaItem = {
  id?: string
  type: 'image' | 'video' | 'webgl'
  src: string
  alt: string
  poster?: string
  confirmNeeded?: boolean
  verification?: VerificationStatus
  projectId?: string
}

export type MediaData = {
  items: MediaItem[]
  honestyNote?: string
}

export type TractionItem = {
  metric: string
  value: string
  verification?: VerificationStatus
  source?: string
}

export type Outcome = {
  metric: string
  before: string
  after: string
  verification?: VerificationStatus
  source?: string
}

export type CounterSpec = {
  start: number
  end: number
  prefix?: string
  suffix?: string
} | null

export type Bio = {
  name: string
  role: string
  tagline: string
  one_sentence: string
  adjectives: [string, string, string]
  photo_artifact: string
  timeline: Array<{
    year: string
    label: string
    kind: 'education' | 'projects' | 'project' | 'future'
    note: string
    verification?: VerificationStatus
  }>
  research_focus: Array<{
    label: string
    why: string
    verification?: VerificationStatus
  }>
  originLines: string[]
  verification?: VerificationStatus
}

export type Startup = {
  id: string
  name: string
  displayName: string
  years: string
  role: string
  problem: string
  bet: string
  whatBuilt: string
  technology: string[]
  traction: TractionItem[]
  learned: string
  status: 'live' | 'exited' | 'shut'
  statusLabel: string
  links: {
    website: string
    github: string
  }
  verification?: VerificationStatus
}

export type Project = {
  id: string
  prjctId: string
  title: string
  subtitle?: string
  year: string
  yearSort: number
  role: string
  type: string
  scope: string
  stack: string[]
  problem: string
  solution: string
  keyDecisions: [string, string, string]
  outcome: Outcome
  links: LinkItem[]
  media: MediaItem[]
  testimonial: {
    quote: string
    name: string
    role: string
  } | null
  verification?: VerificationStatus
}

export type ResearchPublished = {
  id: string
  title: string
  year: string
  venue: string
  plain_summary: string
  so_what: string
  result: string
  links: LinkItem[]
  isPublished: true
  verification?: VerificationStatus
}

export type ResearchFocus = {
  label: string
  why: string
  tags: string[]
  links: LinkItem[]
  verification?: VerificationStatus
}

export type Research = {
  published: ResearchPublished[]
  focusAreas: ResearchFocus[]
}

export type ImpactMetric = {
  id: string
  metric: string
  value: string
  counter: CounterSpec
  before: string
  after: string
  context: string
  source: string
  isPlaceholder?: boolean
  /** Owner-reported facts remain visibly distinct from independently sourced facts. */
  verification?: VerificationStatus
  sourceId?: string
  _template?: boolean
}

export type Testimonial = {
  id: string
  quote: string
  name: string
  role: string
  company: string
  photo: string
  link: string
  verification?: VerificationStatus
  _template?: boolean
}

export type TestimonialsData = {
  items: Testimonial[]
  threeWordDescriptors: Array<{ from: string; words: [string, string, string] }>
  honestyNote: string
}

export type Award = {
  id: string
  name: string
  type: string
  year: string
  venue: string
  link: string
  verification?: VerificationStatus
  _template?: boolean
}
export type AwardsData = { items: Award[]; counterTotal: number; honestyNote: string }

export type MusicTrack = {
  id: string
  title: string
  meta?: string
  verification?: VerificationStatus
}
export type MusicData = {
  tracks: MusicTrack[]
  soundcloud: LinkItem
  honestyNote?: string
}

export type PressItem = {
  id: string
  headline: string
  outlet: string
  date: string
  link: string
  verification?: VerificationStatus
  _template?: boolean
}
export type PressData = { items: PressItem[] }

export type TalkItem = {
  id: string
  title: string
  event: string
  city: string
  year: string
  slides: string
  recording: string
  verification?: VerificationStatus
  _template?: boolean
}
export type TalksData = { items: TalkItem[] }

export type SocialLink = {
  id: string
  label: string
  href: string
  confirmNeeded?: boolean
  verification?: VerificationStatus
}

export type ContactData = {
  email: string
  timezone: string
  location?: string
  socials: SocialLink[]
  availability: {
    status: string
    responseTime: string
  }
  verification?: VerificationStatus
}

export type Capability = {
  id: string
  group: string
  label: string
  built?: CapabilityBuild[]
  verification?: VerificationStatus
}

export type CapabilityBuild = {
  title: string
  detail: string
  href?: string
}

export type SourceCitation = {
  id: string
  label: string
  href: string
  chapter: string
}

export type PortfolioContent = {
  bio: Bio
  capabilities: Capability[]
  startups: Startup[]
  projects: Project[]
  research: Research
  impact: ImpactMetric[]
  testimonials: TestimonialsData
  awards: AwardsData
  music: MusicData
  press: PressData
  talks: TalksData
  contact: ContactData
  media: MediaData
}
