/**
 * The only application content entry point.
 *
 * /content is JSON on purpose: it is editable without a YAML parser, can be
 * validated at module load, and is shared by the client and server context
 * builders.  /data is preserved as the original user drop and is not read.
 */
import bioRaw from '~~/content/bio.json'
import capabilitiesRaw from '~~/content/capabilities.json'
import startupsRaw from '~~/content/startups.json'
import projectsRaw from '~~/content/projects.json'
import researchRaw from '~~/content/research.json'
import impactRaw from '~~/content/impact.json'
import testimonialsRaw from '~~/content/testimonials.json'
import awardsRaw from '~~/content/awards.json'
import musicRaw from '~~/content/music.json'
import pressRaw from '~~/content/press.json'
import talksRaw from '~~/content/talks.json'
import contactRaw from '~~/content/contact.json'
import mediaRaw from '~~/content/media.json'

import { parsePortfolioContent } from '~~/shared/content-model'
import type {
  Bio,
  Capability,
  ContactData,
  ImpactMetric,
  MediaData,
  PortfolioContent,
  PressData,
  Project,
  Research,
  Startup,
  TestimonialsData,
  AwardsData,
  MusicData,
  TalksData
} from '~~/types/content'

const FULL: PortfolioContent = parsePortfolioContent({
  bio: bioRaw,
  capabilities: capabilitiesRaw,
  startups: startupsRaw,
  projects: projectsRaw,
  research: researchRaw,
  impact: impactRaw,
  testimonials: testimonialsRaw,
  awards: awardsRaw,
  music: musicRaw,
  press: pressRaw,
  talks: talksRaw,
  contact: contactRaw,
  media: mediaRaw
})

/**
 * Read the validated aggregate. Values are module-level references so client
 * components and the server-side context see the same snapshot per build.
 */
export function usePortfolioContent(): Readonly<PortfolioContent> {
  return FULL
}

// Preserve the wrapper interfaces used by existing section components.
export function useBio(): Readonly<Bio> { return FULL.bio }
export function useProjects(): Readonly<{ items: Project[] }> { return { items: FULL.projects } }
export function useStartups(): Readonly<{ items: Startup[] }> { return { items: FULL.startups } }
export function useImpact(): Readonly<{ items: ImpactMetric[] }> { return { items: FULL.impact } }
export function useCapabilities(): Readonly<{ items: Capability[] }> { return { items: FULL.capabilities } }
export function useMedia(): Readonly<MediaData> { return FULL.media }
export function useContact(): Readonly<ContactData> { return FULL.contact }
export function useResearch(): Readonly<Research> { return FULL.research }
export function useTestimonials(): Readonly<TestimonialsData> { return FULL.testimonials }
export function useAwards(): Readonly<AwardsData> { return FULL.awards }
export function useMusic(): Readonly<MusicData> { return FULL.music }
export function usePress(): Readonly<PressData> { return FULL.press }
export function useTalks(): Readonly<TalksData> { return FULL.talks }
