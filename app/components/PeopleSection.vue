<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useHorizontalParallax } from '~/composables/useHorizontalParallax'
import { useAwards, useTestimonials } from '~/composables/usePortfolioContent'
import { useTelebot } from '~/composables/useTelebot'
import SpotlightCard from '~/components/ui/SpotlightCard.vue'

const testimonials = useTestimonials()
const awards = useAwards()
const tb = useTelebot()
const descriptors = computed(() => testimonials.threeWordDescriptors.filter((item) => item.from && !item.from.startsWith('[')))
const realAwards = computed(() => awards.items.filter((item) => {
  const name = item.name?.trim()
  const link = item.link?.trim()
  return Boolean(name && !name.startsWith('[') && link && !link.startsWith('[') && link !== '#' && item.verification !== 'placeholder' && !item._template)
}))

const awardsStage = ref<HTMLElement | null>(null)
const awardsViewport = ref<HTMLElement | null>(null)
const awardsTrack = ref<HTMLElement | null>(null)
const awardsProgress = ref<HTMLElement | null>(null)
const { mode: awardsParallaxMode } = useHorizontalParallax({
  stage: awardsStage,
  viewport: awardsViewport,
  track: awardsTrack,
  progress: awardsProgress,
  cardSelector: '[data-award-card]',
})

onMounted(() => tb.setChapterLabel('PEOPLE'))
</script>

<template>
  <section id="ch8" class="chapter people">
    <div class="container">
      <header class="section__head">
        <h2 class="d-120 section__title">Leave room for <em class="emotional">truth.</em></h2>
        <p class="section__lede">Social proof belongs to the people who give it. Until that happens, this page keeps the space honest.</p>
      </header>

      <div class="people__layout">
        <article class="people__proof">
          <div class="people__label mono">Testimonials / {{ testimonials.items.length ? testimonials.items.length : 'none recorded' }}</div>
          <div v-if="testimonials.items.length" class="people__quotes">
            <blockquote v-for="quote in testimonials.items" :key="quote.id">
              <p>“{{ quote.quote }}”</p>
              <footer>— {{ quote.name }} <span class="mono">{{ quote.role }} · {{ quote.company }}</span></footer>
            </blockquote>
          </div>
          <div v-else class="people__blank">
            <span class="people__blank-mark" aria-hidden="true">—</span>
            <p>{{ testimonials.honestyNote || 'No attributed testimonials have been collected yet.' }}</p>
            <span class="mono">Blank by design / no fabricated quote</span>
          </div>
          <ul v-if="descriptors.length" class="people__descriptors">
            <li v-for="descriptor in descriptors" :key="descriptor.from"><span class="mono">{{ descriptor.from }}</span>{{ descriptor.words.join(' · ') }}</li>
          </ul>
        </article>

        <article class="people__recognition">
          <div class="people__label mono">Recognitions / public program records</div>
          <p class="people__award-count">{{ String(realAwards.length).padStart(2, '0') }}</p>
          <p class="people__award-caption">awards recorded</p>

          <div ref="awardsStage" class="people__awards-stage" :data-parallax-mode="awardsParallaxMode">
            <div class="people__awards-bar" aria-hidden="true">
              <span class="mono">{{ realAwards.length ? `${String(realAwards.length).padStart(2, '0')} PROGRAM RECORDS` : 'PUBLIC RECORDS ONLY' }}</span>
              <span class="mono people__awards-hint">{{ awardsParallaxMode === 'native' ? 'SWIPE' : 'SCROLL' }} TO EXPLORE <span aria-hidden="true">→</span></span>
            </div>

            <div ref="awardsViewport" class="people__awards-viewport" tabindex="0" role="region" aria-label="Awards and recognitions">
              <div ref="awardsTrack" class="people__awards-track" role="list">
                <article class="people__awards-intro-card" data-award-card role="listitem">
                  <div>
                    <span class="mono people__awards-intro-kicker">RECOGNITION WALL</span>
                    <h3>Proof, when it has a <em class="emotional">source.</em></h3>
                    <p v-if="realAwards.length">Each card points to the relevant official program page. Personal correspondence remains marked owner-reported.</p>
                    <p v-else>No award cards are published yet. The wall stays empty until a public source is confirmed.</p>
                  </div>
                  <span class="people__awards-intro-mark" aria-hidden="true">↗</span>
                </article>

                <SpotlightCard
                  v-for="(award, index) in realAwards"
                  :key="award.id"
                  class="people__award-card"
                  data-award-card
                  role="listitem"
                  :eyebrow="`${award.year} / ${award.type}`"
                  :title="award.name"
                  :description="award.venue"
                  :index="String(index + 1).padStart(2, '0')"
                   :tags="[award.type, award.verification === 'owner-reported-awaiting-source' ? 'OWNER-REPORTED' : 'CONFIRMED']"
                >
                  <a class="people__award-link" :href="award.link" target="_blank" rel="noopener noreferrer">
                    View public source <span aria-hidden="true">↗</span>
                  </a>
                </SpotlightCard>
              </div>
            </div>

            <div class="people__awards-progress" aria-hidden="true"><span ref="awardsProgress"></span></div>
          </div>
        </article>
      </div>

    </div>
  </section>
</template>

<style scoped>
.people__layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: clamp(56px, 8vw, 120px); border-top: 1px solid var(--line); }
.people__proof, .people__recognition { padding-top: 20px; min-width: 0; }
.people__recognition { padding-top: clamp(28px, 4vw, 52px); border-top: 1px solid var(--line); }
.people__label { color: var(--muted); }
.people__quotes { margin-top: 38px; }.people__quotes blockquote { padding: 20px 0; border-top: 1px solid var(--line); }.people__quotes p { max-width: 34ch; font: italic clamp(24px, 3vw, 42px)/1.08 var(--font-serif); }.people__quotes footer { margin-top: 14px; color: var(--muted); font-size: 14px; }.people__quotes footer .mono { margin-left: 6px; }
.people__blank { min-height: 250px; display: grid; align-content: center; gap: 14px; margin-top: 28px; padding: clamp(20px, 4vw, 52px); border: 1px dashed var(--line-strong); background: repeating-linear-gradient(135deg, transparent 0 13px, color-mix(in oklab, var(--warm) 5%, transparent) 13px 14px); }.people__blank-mark { color: var(--warm); font-size: 46px; }.people__blank p { max-width: 44ch; color: var(--muted); line-height: 1.55; }.people__blank .mono { color: var(--warm); }
.people__descriptors { margin-top: 24px; list-style: none; border-top: 1px solid var(--line); }.people__descriptors li { display: flex; gap: 13px; padding: 12px 0; border-bottom: 1px solid var(--line); }.people__descriptors .mono { min-width: 100px; color: var(--muted); }
.people__award-count { margin-top: 52px; color: var(--accent); font: 500 clamp(86px, 13vw, 190px)/.8 var(--font-display); letter-spacing: -.08em; }
.people__award-caption { margin-top: 14px; color: var(--muted); font: 11px var(--font-mono); text-transform: uppercase; letter-spacing: .1em; }
.people__awards-stage { position: relative; margin-top: clamp(42px, 5vw, 68px); }
.people__awards-bar { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 12px 0; border-top: 1px solid var(--line); color: var(--muted); }
.people__awards-bar .mono { font-size: 9px; }
.people__awards-hint { color: var(--accent); white-space: nowrap; }
.people__awards-viewport { overflow: hidden; outline-offset: 5px; }
.people__awards-viewport:focus-visible { outline: 2px solid var(--accent); }
.people__awards-track { --awards-card-width: clamp(340px, 36vw, 540px); --awards-card-height: clamp(420px, 32vw, 500px); display: flex; align-items: stretch; gap: clamp(20px, 2.2vw, 32px); width: max-content; min-height: var(--awards-card-height); padding: 18px 1px 30px; will-change: transform; }
.people__awards-intro-card,
.people__award-card { flex: 0 0 var(--awards-card-width); height: var(--awards-card-height); }
.people__awards-intro-card { display: flex; flex-direction: column; justify-content: space-between; padding: clamp(18px, 2.4vw, 28px); border: 1px solid var(--ink); border-radius: var(--radius-lg); background: var(--ink); color: var(--bg); box-shadow: 8px 10px 0 var(--accent-soft); }
.people__awards-intro-kicker { color: var(--accent-on-ink); }
.people__awards-intro-card h3 { max-width: 8ch; margin-top: clamp(40px, 5vw, 64px); font-size: clamp(36px, 4vw, 58px); line-height: .92; letter-spacing: -.06em; }
.people__awards-intro-card h3 em { color: var(--accent-on-ink); }
.people__awards-intro-card p { max-width: 30ch; margin-top: 14px; color: color-mix(in oklab, var(--bg) 68%, transparent); font-size: 14px; line-height: 1.5; }
.people__awards-intro-mark { display: grid; place-items: center; align-self: flex-end; width: 46px; aspect-ratio: 1; border: 1px solid color-mix(in oklab, var(--bg) 34%, transparent); border-radius: 50%; color: var(--accent-on-ink); font-size: 20px; }
.people__award-card { border-radius: var(--radius-lg); }
.people__award-card :deep(.spotlight-card__body) { gap: clamp(16px, 2vw, 28px); padding: clamp(24px, 3.2vw, 46px); }
.people__award-card :deep(.spotlight-card__title) { max-width: 10ch; font-size: clamp(30px, 3.6vw, 52px); line-height: .92; }
.people__award-card :deep(.spotlight-card__description) { min-height: 44px; font-size: clamp(15px, 1.35vw, 19px); }
.people__award-card :deep(.spotlight-card__tags) { min-height: 38px; align-content: flex-start; }
.people__award-link { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 15px; border-top: 1px solid var(--line); color: var(--accent); font: 11px var(--font-mono); letter-spacing: .04em; text-transform: uppercase; }
.people__award-link:hover { color: var(--accent-emph); }
.people__awards-progress { height: 2px; margin-top: 2px; background: var(--line); }
.people__awards-progress span { display: block; width: 100%; height: 100%; transform: scaleX(0); transform-origin: left; background: var(--accent); }
.people__awards-stage[data-parallax-mode="static"] .people__awards-viewport { overflow: visible; }
.people__awards-stage[data-parallax-mode="static"] .people__awards-track { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.people__awards-stage[data-parallax-mode="static"] .people__awards-intro-card,
.people__awards-stage[data-parallax-mode="static"] .people__award-card { width: auto; height: auto; min-height: var(--awards-card-height); }
.people__awards-stage[data-parallax-mode="static"] .people__awards-progress { display: none; }
@media (max-width: 800px) {
  .people__awards-viewport { overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; }
  .people__awards-track { padding-right: 24px; }
}
@media (max-width: 760px) {
  .people__recognition { padding-top: 24px; }
}
@media (max-width: 600px) {
  .people__awards-bar { display: grid; gap: 5px; align-items: start; }
  .people__awards-track { --awards-card-width: min(82vw, 350px); --awards-card-height: 360px; gap: 14px; min-height: var(--awards-card-height); }
  .people__awards-intro-card,
  .people__award-card { flex-basis: var(--awards-card-width); height: var(--awards-card-height); }
}
@media (max-width: 800px) {
  .people__awards-stage[data-parallax-mode="static"] .people__awards-track { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .people__awards-track { width: 100%; display: grid; grid-template-columns: 1fr; }
  .people__awards-intro-card,
  .people__award-card { height: auto; min-height: var(--awards-card-height); }
  .people__awards-progress { display: none; }
}
</style>
