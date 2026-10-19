<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBio } from '~/composables/usePortfolioContent'
import { useSplitReveal } from '~/composables/useSplitReveal'
import { useReveal } from '~/composables/useReveal'

const bio = useBio()
const root = ref<HTMLElement | null>(null)

const storyBeats = computed(() => [
  { label: '01 / CURIOSITY', text: bio.originLines[0] },
  { label: '02 / THE INTERSECTION', text: bio.originLines[2] },
  { label: '03 / STILL BUILDING', text: bio.originLines[4] },
].filter(beat => beat.text))

// letters / words:  everything with data-split="..."
useSplitReveal(root)
// whole blocks:     everything with .reveal-block (the diagram, its nodes)
useReveal(root)
</script>

<template>
  <section id="ch2" ref="root" class="chapter origin">
    <div class="container">
      <header class="section__head">
        <!-- blurFocus: words snap into focus, cinematic -->
        <h2 class="d-120 section__title" data-split="blurFocus" data-split-delay="0.15">Curiosity became a <em class="emotional">practice.</em></h2>
        <!-- fill: dim words light up while you scroll -->
        <p class="section__lede" data-split="fill">The thread is simple: understand the system, imagine what it could become, then build an imperfect version in public.</p>
      </header>

      <div class="origin__layout">
        <!-- the diagram uses block reveals (useReveal), no letter splitting here -->
        <figure class="origin__diagram" aria-label="A build practice: curiosity becomes a system, then an experience">
          <div class="origin__diagram-head mono reveal-block"><span>THE BUILD LOOP</span><span>01 — 03</span></div>
          <div class="origin__route" aria-hidden="true">
            <span class="origin__route-line"></span>
            <span class="origin__route-node reveal-block"><i></i><b>NOTICE</b></span>
            <span class="origin__route-node reveal-block"><i></i><b>CONNECT</b></span>
            <span class="origin__route-node reveal-block"><i></i><b>MAKE</b></span>
          </div>
          <div class="origin__diagram-foot reveal-block"><span class="origin__signal" aria-hidden="true"></span><span class="mono">CURIOSITY → WORKING THING</span></div>
          <figcaption class="reveal-block">Understanding the system is only the start. The idea has to work in someone’s hands.</figcaption>
        </figure>

        <ol class="origin__lines">
          <li v-for="beat in storyBeats" :key="beat.label">
             <span class="mono origin__number" data-split="scramble">{{ beat.label }}</span>
             <p data-split="fill">{{ beat.text }}</p>
          </li>
        </ol>
      </div>

    </div>
  </section>
</template>

<style scoped>
.origin__layout { display: grid; grid-template-columns: minmax(260px, .72fr) minmax(0, 1.28fr); gap: clamp(32px, 6.5vw, 100px); align-items: start; }
.origin__diagram { position: sticky; top: 112px; display: grid; min-height: 340px; align-content: space-between; overflow: hidden; margin: 0; padding: clamp(20px, 3.2vw, 36px); color: #f4f1e9; background-color: #202725; background-image: linear-gradient(rgba(244,241,233,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(244,241,233,.055) 1px, transparent 1px); background-size: 32px 32px; }
.origin__diagram-head, .origin__diagram-foot { display: flex; align-items: center; justify-content: space-between; gap: 18px; font-size: 10px; }
.origin__diagram-head span:last-child { color: #b6c98b; }
.origin__route { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; align-items: center; padding-block: 34px; }
.origin__route-line { position: absolute; top: 50%; left: 10%; right: 10%; height: 1px; background: rgba(244,241,233,.34); }
.origin__route-node { position: relative; z-index: 1; display: grid; justify-items: center; gap: 10px; color: #202725; }
.origin__route-node i { display: grid; place-items: center; width: 54px; aspect-ratio: 1; border: 1px solid #b6c98b; border-radius: 50%; background: #202725; color: #d4ef91; font: normal 12px var(--font-mono); }
.origin__route-node:last-of-type i { background: #d4ef91; color: #202725; }
.origin__route-node b { color: #d8d9d1; font: 10px var(--font-mono); letter-spacing: .08em; }
.origin__signal { width: 8px; height: 8px; border-radius: 50%; background: #d4ef91; box-shadow: 0 0 0 5px rgba(212,239,145,.12); }
.origin__diagram figcaption { max-width: 34ch; color: rgba(244,241,233,.76); font-size: 17px; line-height: 1.45; }
.origin__lines { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--line); }
.origin__lines li { display: grid; grid-template-columns: 124px minmax(0, 1fr); gap: 16px; padding: clamp(22px, 3vw, 40px) 0; border-bottom: 1px solid var(--line); }
.origin__number { padding-top: 7px; color: var(--accent); font-size: 10px; }
.origin__lines p { max-width: 53ch; font-size: clamp(18px, 1.8vw, 24px); line-height: 1.48; }
@media (max-width: 760px) { .origin__layout { grid-template-columns: 1fr; } .origin__diagram { position: static; min-height: 280px; } .origin__lines li { grid-template-columns: 1fr; gap: 8px; } }
</style>
