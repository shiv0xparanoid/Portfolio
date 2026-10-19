/** Server-side canonical content snapshot and grounded source catalog. */
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
import { buildSourceCatalog, parsePortfolioContent } from '~~/shared/content-model'
import type { PortfolioContent, SourceCitation } from '~~/types/content'

let cached: { content: PortfolioContent; sources: SourceCitation[]; context: string } | null = null

function createSnapshot() {
  if (cached) return cached
  const content = parsePortfolioContent({
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
  const sources = buildSourceCatalog(content)
  // Keep the model context bounded and intentionally human-readable.  It is
  // never built from request input and contains no secrets or private logs.
  const context = JSON.stringify({
    bio: content.bio,
    capabilities: content.capabilities,
    startups: content.startups,
    projects: content.projects,
    research: content.research,
    impact: content.impact,
    testimonials: content.testimonials,
    awards: content.awards,
    music: content.music,
    press: content.press,
    talks: content.talks,
    contact: content.contact,
    media: content.media,
    sourceCatalog: sources
  })
  // The object was parsed and validated before serialization. Keep it intact
  // so prompt-caching never receives a truncated, invalid JSON document.
  cached = { content, sources, context }
  return cached
}

export function getPortfolioSnapshot() {
  return createSnapshot()
}

export function getSource(id: string) {
  return createSnapshot().sources.find(source => source.id === id) ?? null
}

export function getSources(ids: string[]) {
  const known = new Map(createSnapshot().sources.map(source => [source.id, source]))
  return Array.from(new Set(ids)).map(id => known.get(id)).filter((source): source is SourceCitation => Boolean(source))
}
