<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStartups } from '~/composables/usePortfolioContent'
import { useTelebot } from '~/composables/useTelebot'
import type { Startup } from '~~/types/content'

const { items } = useStartups()
const tb = useTelebot()
const holo = computed<Startup | null>(() => items.find((item) => /holopad/i.test(`${item.id} ${item.name} ${item.displayName}`)) ?? null)
const verifiedLinks = computed(() => {
  if (!holo.value?.links) return []
  return [
    { label: 'Website', href: holo.value.links.website },
    { label: 'GitHub', href: holo.value.links.github }
  ].filter((link) => link.href && !link.href.startsWith('[PLACEHOLDER') && link.href !== '#')
})

onMounted(() => tb.setChapterLabel('VENTURES'))
</script>

<template>
  <section id="ch4" class="chapter startups">
    <div class="container">
      <header class="section__head">
        <h2 class="d-120 section__title">The bet, in <em class="emotional">public.</em></h2>
        <p class="section__lede">One venture is documented here without smoothing away the uncertainty: the problem, the bet, the build, and what still needs proving.</p>
      </header>

      <div v-if="holo" class="startup-file">
        <details open class="startup-file__details">
          <summary class="startup-file__summary">
            <span class="mono startup-file__id">FILE / 01</span>
            <span class="startup-file__name">{{ holo.displayName || holo.name }}</span>
            <span class="mono startup-file__date">{{ holo.years }}</span>
            <span class="startup-file__toggle" aria-hidden="true">+</span>
          </summary>

          <div class="startup-file__body">
            <div class="startup-file__row">
              <h3>Problem</h3>
              <p>{{ holo.problem }}</p>
            </div>
            <div class="startup-file__row">
              <h3>Bet</h3>
              <p>{{ holo.bet }}</p>
            </div>
            <div class="startup-file__row startup-file__row--wide">
              <h3>Build</h3>
              <div>
                <p>{{ holo.whatBuilt }}</p>
                <ul v-if="holo.technology?.length" class="startup-file__stack" aria-label="Technology used">
                  <li v-for="tool in holo.technology" :key="tool">{{ tool }}</li>
                </ul>
              </div>
            </div>
            <div class="startup-file__row startup-file__row--wide">
              <h3>Traction</h3>
              <ul class="startup-file__traction">
                <li v-for="entry in holo.traction" :key="`${entry.metric}-${entry.value}`" :class="{ 'is-pending': entry.value.startsWith('[PLACEHOLDER') }">
                  <span>{{ entry.metric }}</span><span class="mono">{{ entry.value }}</span>
                </li>
              </ul>
            </div>
            <div class="startup-file__row">
              <h3>Learned</h3>
              <p>{{ holo.learned }}</p>
            </div>
            <div class="startup-file__row">
              <h3>Status</h3>
              <p><span class="startup-file__status" :class="{ 'is-live': holo.status === 'live' }"></span>{{ holo.statusLabel }}</p>
            </div>
          </div>
          <footer v-if="verifiedLinks.length" class="startup-file__links">
            <a v-for="link in verifiedLinks" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer" class="link-underline">{{ link.label }} ↗</a>
          </footer>
        </details>
      </div>
      <p v-else class="mono pending">HOLOPAD case file pending source data.</p>

    </div>
  </section>
</template>

<style scoped>
.startup-file { border-top: 1px solid var(--line); }
.startup-file__details { border-bottom: 1px solid var(--line); }
.startup-file__summary { display: grid; grid-template-columns: 100px minmax(0, 1fr) auto 28px; gap: 16px; align-items: baseline; padding: 22px 0; list-style: none; cursor: pointer; }
.startup-file__summary::-webkit-details-marker { display: none; }
.startup-file__id { color: var(--accent); }
.startup-file__name { font-size: clamp(30px, 5vw, 76px); font-weight: 500; letter-spacing: -.065em; line-height: .9; }
.startup-file__date { color: var(--muted); }
.startup-file__toggle { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--line-strong); font-size: 20px; line-height: 1; }
.startup-file__details[open] .startup-file__toggle { color: var(--accent); transform: rotate(45deg); }
.startup-file__body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 clamp(24px, 5.6vw, 80px); padding: 10px 0 22px; }
.startup-file__row { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 15px; padding: 18px 0; border-top: 1px solid var(--line); }
.startup-file__row--wide { grid-column: 1 / -1; }
.startup-file__row h3 { padding-top: 3px; color: var(--muted); font: 11px/1.2 var(--font-mono); letter-spacing: .1em; text-transform: uppercase; }
.startup-file__row p { max-width: 55ch; font-size: 17px; line-height: 1.5; }
.startup-file__stack { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; list-style: none; }
.startup-file__stack li { padding: 4px 8px; border: 1px solid var(--line); color: var(--muted); font: 11px/1 var(--font-mono); }
.startup-file__traction { list-style: none; border-top: 1px solid var(--line); }
.startup-file__traction li { display: grid; grid-template-columns: minmax(0, 1fr) minmax(180px, .7fr); gap: 20px; padding: 11px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.startup-file__traction .mono { color: var(--ink); text-align: right; }
.startup-file__traction .is-pending { color: var(--warm); }
.startup-file__status { display: inline-block; width: 8px; height: 8px; margin-right: 10px; border-radius: 50%; background: var(--muted); }
.startup-file__status.is-live { background: var(--accent); box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 18%, transparent); }
.startup-file__links { display: flex; flex-wrap: wrap; gap: 20px; padding: 16px 0; border-top: 1px solid var(--line); }
.startup-file__links a { color: var(--ink); }
@media (max-width: 700px) { .startup-file__summary { grid-template-columns: 60px minmax(0, 1fr) 28px; } .startup-file__date { grid-column: 2; } .startup-file__body { grid-template-columns: 1fr; } .startup-file__row--wide { grid-column: auto; } .startup-file__row { grid-template-columns: 70px minmax(0, 1fr); } .startup-file__traction li { grid-template-columns: 1fr; gap: 5px; } .startup-file__traction .mono { text-align: left; } }
</style>
