<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCapabilities } from '~/composables/usePortfolioContent'
import { useHorizontalParallax } from '~/composables/useHorizontalParallax'
import { useSplitReveal } from '~/composables/useSplitReveal'
import SpotlightCard from '~/components/ui/SpotlightCard.vue'
import type { Capability, CapabilityBuild } from '~~/types/content'

const root = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const track = ref<HTMLElement | null>(null)
const progress = ref<HTMLElement | null>(null)
const { items } = useCapabilities()
const capabilities = computed<Capability[]>(() => items)

type CapabilityGroup = {
  name: string
  description: string
  items: Capability[]
  skills: string[]
  builds: CapabilityBuild[]
}

const groupDescriptions: Record<string, string> = {
  'AI / ML': 'Teach systems to see, retrieve, and turn messy inputs into useful decisions.',
  'WEB DEVELOPMENT': 'Ship interfaces and services that keep the idea close to the interaction.',
  '3D / GRAPHICS': 'Make the browser feel spatial with real-time scenes, shaders, and motion.',
  BACKEND: 'Give experiments a dependable place to store data and expose their next action.',
  RESEARCH: 'Explore computer vision and spatial interfaces as practical, human-scale tools.'
}

const capabilityGroups = computed<CapabilityGroup[]>(() => {
  const grouped = new Map<string, { items: Capability[]; builds: CapabilityBuild[] }>()

  capabilities.value.forEach((capability) => {
    const group = grouped.get(capability.group) || { items: [], builds: [] }
    group.items.push(capability)

    capability.built?.forEach((build) => {
      const alreadyAdded = group.builds.some((item) => item.title === build.title && item.detail === build.detail)
      if (!alreadyAdded) group.builds.push(build)
    })

    grouped.set(capability.group, group)
  })

  return Array.from(grouped, ([name, group]) => ({
    name,
    description: groupDescriptions[name] || 'A working part of the current making practice.',
    items: group.items,
    skills: group.items.map((item) => item.label),
    builds: group.builds
  }))
})

useSplitReveal(root)
const { mode: parallaxMode } = useHorizontalParallax({
  stage,
  viewport,
  track,
  progress,
  cardSelector: '[data-capability-card]',
})
</script>

<template>
  <section id="ch3" ref="root" class="chapter capabilities">
    <div class="container">
      <header class="section__head">
        <h2 class="d-120 section__title" data-split="flip" data-split-delay="0.1">A working vocabulary for <em class="emotional">making.</em></h2>
        <p class="section__lede" data-split="fill">Tools are useful when they move an idea forward. Scroll through the systems I know, then see the products and experiments they have already powered.</p>
      </header>

      <div ref="stage" class="capabilities__stage" :data-parallax-mode="parallaxMode">
        <div class="capabilities__stage-bar" aria-hidden="true">
          <span class="mono">{{ String(capabilities.length).padStart(2, '0') }} SKILLS / {{ capabilityGroups.length }} DOMAINS</span>
          <span class="mono capabilities__stage-hint">{{ parallaxMode === 'native' ? 'SWIPE' : 'SCROLL' }} TO EXPLORE <span class="capabilities__stage-arrow">→</span></span>
        </div>

        <div ref="viewport" class="capabilities__viewport" tabindex="0" role="region" aria-label="Capabilities and projects built with them">
          <div ref="track" class="capabilities__track" role="list">
            <article class="capabilities__intro-card" role="listitem">
              <div>
                <span class="mono capabilities__intro-kicker">A WORKING VOCABULARY</span>
                <h3 data-split="slide">From tools to <em class="emotional">proof.</em></h3>
                <p>Each card pairs a working skill with the projects, products, and interfaces it has helped bring to life.</p>
              </div>
              <div class="capabilities__intro-mark" aria-hidden="true"><span>→</span></div>
            </article>

            <SpotlightCard
              v-for="(group, groupIndex) in capabilityGroups"
              :key="group.name"
              class="capabilities__card"
              data-capability-card
              role="listitem"
              :aria-label="`${group.name} capabilities`"
              :eyebrow="`${String(groupIndex + 1).padStart(2, '0')} / ${group.name}`"
              :title="group.name"
              :description="group.description"
              :index="String(groupIndex + 1).padStart(2, '0')"
              :tags="group.skills"
            >
              <div class="capabilities__card-meta">
                <span class="mono">BUILT WITH THIS</span>
                <span class="mono">{{ group.builds.length }} {{ group.builds.length === 1 ? 'BUILD' : 'BUILDS' }}</span>
              </div>
              <ul class="capabilities__builds">
                <li v-for="build in group.builds" :key="`${build.title}-${build.detail}`">
                  <NuxtLink v-if="build.href" :to="build.href" class="capabilities__build-link">
                    <span>{{ build.title }} <span aria-hidden="true">↗</span></span>
                    <small>{{ build.detail }}</small>
                  </NuxtLink>
                  <span v-else class="capabilities__build-link">
                    <span>{{ build.title }}</span>
                    <small>{{ build.detail }}</small>
                  </span>
                </li>
              </ul>
            </SpotlightCard>
          </div>
        </div>

        <div class="capabilities__progress" aria-hidden="true"><span ref="progress"></span></div>
      </div>

    </div>
  </section>
</template>

<style scoped>
.capabilities__stage { position: relative; }
.capabilities__stage-bar { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 12px 0; border-top: 1px solid var(--line); color: var(--muted); }
.capabilities__stage-bar .mono { font-size: 10px; }
.capabilities__stage-hint { color: var(--accent); }
.capabilities__stage-arrow { display: inline-block; margin-left: 6px; font-size: 15px; transition: transform var(--dur-s) var(--ease-out); }
.capabilities__stage:hover .capabilities__stage-arrow { transform: translateX(5px); }
.capabilities__viewport { overflow: hidden; outline-offset: 5px; }
.capabilities__viewport:focus-visible { outline: 2px solid var(--accent); }
.capabilities__track { display: flex; align-items: stretch; gap: clamp(16px, 2vw, 28px); width: max-content; min-height: clamp(390px, 40vw, 560px); padding: 16px 1px 28px; will-change: transform; }
.capabilities__intro-card,
.capabilities__card { flex: 0 0 clamp(300px, 29vw, 430px); height: clamp(390px, 40vw, 560px); }
.capabilities__intro-card { display: flex; flex-direction: column; justify-content: space-between; padding: clamp(24px, 3.5vw, 48px); border: 1px solid var(--ink); border-radius: var(--radius-lg); background: var(--ink); color: var(--bg); box-shadow: 10px 12px 0 var(--accent-soft); }
.capabilities__intro-kicker { color: var(--accent-on-ink); }
.capabilities__intro-card h3 { max-width: 7ch; margin-top: clamp(60px, 8vw, 112px); font-size: clamp(42px, 5vw, 76px); line-height: .9; letter-spacing: -.06em; }
.capabilities__intro-card h3 em { color: var(--accent-on-ink); }
.capabilities__intro-card p { max-width: 30ch; margin-top: 22px; color: color-mix(in oklab, var(--bg) 68%, transparent); font-size: 15px; line-height: 1.55; }
.capabilities__intro-mark { display: grid; place-items: center; align-self: flex-end; width: 54px; aspect-ratio: 1; border: 1px solid color-mix(in oklab, var(--bg) 34%, transparent); border-radius: 50%; color: var(--accent-on-ink); font-size: 24px; }
.capabilities__card { border-radius: var(--radius-lg); }
.capabilities__card :deep(.spotlight-card__body) { gap: 16px; }
.capabilities__card :deep(.spotlight-card__description) { min-height: 70px; font-size: 15px; }
.capabilities__card :deep(.spotlight-card__tags) { min-height: 54px; align-content: flex-start; }
.capabilities__card-meta { display: flex; justify-content: space-between; gap: 16px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--accent); }
.capabilities__card-meta .mono { font-size: 9px; }
.capabilities__builds { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.capabilities__builds li { min-width: 0; }
.capabilities__build-link { display: grid; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--line); color: var(--ink); }
a.capabilities__build-link:hover { color: var(--accent); }
.capabilities__build-link > span { display: flex; justify-content: space-between; gap: 12px; font-size: 15px; line-height: 1.2; }
.capabilities__build-link small { color: var(--muted); font-size: 12px; line-height: 1.4; }
.capabilities__progress { height: 2px; margin-top: 2px; background: var(--line); }
.capabilities__progress span { display: block; width: 100%; height: 100%; transform: scaleX(0); transform-origin: left; background: var(--accent); }
.capabilities__stage[data-parallax-mode="static"] .capabilities__viewport { overflow: visible; }
.capabilities__stage[data-parallax-mode="static"] .capabilities__track { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.capabilities__stage[data-parallax-mode="static"] .capabilities__intro-card,
.capabilities__stage[data-parallax-mode="static"] .capabilities__card { width: auto; height: auto; min-height: 360px; }
.capabilities__stage[data-parallax-mode="static"] .capabilities__progress { display: none; }
@media (max-width: 800px) {
  .capabilities__viewport { overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; }
  .capabilities__track { padding-right: 24px; }
  .capabilities__stage-bar { align-items: flex-start; }
  .capabilities__stage-hint { white-space: nowrap; }
}
@media (max-width: 600px) {
  .capabilities__stage-bar { display: grid; gap: 5px; }
  .capabilities__track { gap: 14px; min-height: 470px; padding-top: 12px; }
  .capabilities__intro-card,
  .capabilities__card { flex-basis: min(82vw, 360px); height: 470px; }
  .capabilities__intro-card { padding: 24px; }
  .capabilities__intro-card h3 { margin-top: 56px; font-size: 52px; }
}
@media (max-width: 800px) {
  .capabilities__stage[data-parallax-mode="static"] .capabilities__track { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .capabilities__track { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); }
  .capabilities__intro-card,
  .capabilities__card { height: auto; min-height: 360px; }
  .capabilities__progress { display: none; }
}
</style>
