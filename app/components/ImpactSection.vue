<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useImpact } from '~/composables/usePortfolioContent'
import { useTelebot } from '~/composables/useTelebot'
import type { ImpactMetric } from '~~/types/content'

const { items } = useImpact()
const tb = useTelebot()
const reported = computed(() => items.filter((metric) => ['aero-28-101', 'holopad-prototype-1-0'].includes(metric.id) && !metric.isPlaceholder && !metric._template))
function sourceText(metric: ImpactMetric) {
  return !metric.source || /\[PLACEHOLDER|confirm|pending/i.test(metric.source) ? 'Source pending confirmation' : `Source: ${metric.source}`
}
onMounted(() => tb.setChapterLabel('IMPACT'))
</script>

<template>
  <section id="ch6" class="chapter impact">
    <div class="container">
      <header class="section__head">
        <h2 class="d-120 section__title">Proof, without the <em class="emotional">performance.</em></h2>
        <p class="section__lede">Only owner-reported results are shown here. No growth counters, invented reach, or proxy metrics fill the silence.</p>
      </header>

      <div v-if="reported.length" class="impact__list">
        <article v-for="metric in reported" :key="metric.id" class="impact__item">
          <div class="impact__item-top"><span class="mono impact__index">{{ metric.id }}</span><span class="mono">{{ metric.metric }}</span></div>
          <p class="impact__value">{{ metric.value }}</p>
          <div class="impact__proof">
            <p><span class="mono">BEFORE</span>{{ metric.before }}</p>
            <p><span class="mono">AFTER</span>{{ metric.after }}</p>
            <p><span class="mono">CONTEXT</span>{{ metric.context }}</p>
          </div>
          <p class="impact__source mono" :class="{ pending: sourceText(metric).startsWith('Source pending') }">{{ sourceText(metric) }}</p>
        </article>
      </div>
      <p v-else class="mono pending">No owner-reported impact rows are ready.</p>

      <footer class="impact__foot mono">Source confirmation pending where marked. A blank row is more useful than a made-up number.</footer>
    </div>
  </section>
</template>

<style scoped>
.impact__list { border-top: 1px solid var(--line); }
.impact__item { display: grid; grid-template-columns: minmax(160px, .6fr) minmax(200px, 1fr) minmax(260px, 1.1fr); grid-template-rows: auto 1fr; gap: 20px clamp(20px, 4vw, 72px); padding: clamp(22px, 3.2vw, 46px) 0; border-bottom: 1px solid var(--line); }
.impact__item-top { grid-column: 1; display: grid; gap: 8px; align-content: start; color: var(--muted); }
.impact__index { color: var(--accent); }
.impact__value { grid-column: 2; grid-row: 1 / span 2; align-self: start; color: var(--accent); font: 500 clamp(48px, 7vw, 112px)/.85 var(--font-display); letter-spacing: -.075em; }
.impact__proof { grid-column: 3; display: grid; gap: 10px; }
.impact__proof p { display: grid; grid-template-columns: 60px minmax(0, 1fr); gap: 11px; color: var(--muted); font-size: 14px; line-height: 1.45; }
.impact__proof .mono { color: var(--ink); }
.impact__source { grid-column: 3; align-self: end; color: var(--muted); line-height: 1.45; }
.impact__source.pending { color: var(--warm); }
.impact__foot { margin-top: 16px; color: var(--muted); }
@media (max-width: 820px) { .impact__item { grid-template-columns: 1fr 1fr; gap: 20px; } .impact__item-top, .impact__value { grid-column: auto; grid-row: auto; } .impact__proof, .impact__source { grid-column: 1 / -1; } }
@media (max-width: 520px) { .impact__item { grid-template-columns: 1fr; } .impact__value { font-size: 68px; } }
</style>
