<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResearch } from '~/composables/usePortfolioContent'
import { useSplitReveal } from '~/composables/useSplitReveal'
import { useReveal } from '~/composables/useReveal'
import type { ResearchFocus, ResearchPublished } from '~~/types/content'

const research = useResearch()
const root = ref<HTMLElement | null>(null)
const published = computed(() => research.published ?? [])
const focusAreas = computed(() => research.focusAreas ?? [])

function hrefFor(item: ResearchPublished | ResearchFocus) {
  const href = item.links?.[0]?.href
  return href && !href.startsWith('[PLACEHOLDER') && href !== '#' ? href : ''
}

// letters / words: everything with data-split="..."
useSplitReveal(root)
// whole blocks: article links and focus tags (.reveal-block)
useReveal(root)
</script>

<template>
  <section id="ch5" ref="root" class="chapter research">
    <div class="container">
      <header class="section__head">
        <!-- scramble: the heading starts illegible and resolves into words (the idea of the chapter) -->
        <h2 class="d-120 section__title" data-split="scramble" data-split-delay="0.1">Make the complex <em class="emotional">legible.</em></h2>
        <!-- fill: dim words light up as you read -->
        <p class="section__lede" data-split="fill">Published writing and active questions sit apart on purpose. One is an article; the other is a map of what is being explored.</p>
      </header>

      <section aria-labelledby="published-title" class="research__published">
        <div class="research__label"><span id="published-title" class="mono" data-split="maskRise">Published / article</span><span class="mono">01</span></div>
        <article v-for="article in published" :key="article.id" class="research__article">
          <div class="research__article-meta mono"><span>{{ article.year }}</span><span>{{ article.venue }}</span></div>
          <!-- blurFocus: the title comes into focus -->
           <h3 data-split="blurFocus">{{ article.title }}</h3>
          <!-- fill: the plain-language summary lights up while you scroll -->
           <p class="research__summary" data-split="fill"><strong>In plain language</strong>{{ article.plain_summary }}</p>
          <!-- text is wrapped in its own span so the grid keeps exactly 2 columns -->
           <p class="research__result"><span class="mono">SO WHAT</span><span data-split="maskRise">{{ article.so_what }}</span></p>
           <p class="research__result"><span class="mono">RESULT</span><span data-split="maskRise" data-split-delay="0.15">{{ article.result }}</span></p>
          <a v-if="hrefFor(article)" class="link-underline reveal-block" :href="hrefFor(article)" target="_blank" rel="noopener noreferrer">Read the article ↗</a>
          <span v-else class="mono pending">Article link pending confirmation.</span>
        </article>
        <p v-if="!published.length" class="mono pending">No published articles recorded yet.</p>
      </section>

      <section aria-labelledby="focus-title" class="research__focus-section">
        <div class="research__label"><span id="focus-title" class="mono" data-split="maskRise">Focus areas / not all published</span><span class="mono">{{ String(focusAreas.length).padStart(2, '0') }}</span></div>
        <div class="topic-map" aria-label="Research focus topic map">
          <span class="topic-map__axis topic-map__axis--one mono" data-split="scramble">DATA</span>
          <span class="topic-map__axis topic-map__axis--two mono" data-split="scramble" data-split-delay="0.2">VISION</span>
          <span class="topic-map__axis topic-map__axis--three mono" data-split="scramble" data-split-delay="0.4">INTERACTION</span>
          <ul>
            <li v-for="(focus, index) in focusAreas" :key="focus.label" :style="{ '--node-index': index }">
              <span class="topic-map__node-index mono">{{ String(index + 1).padStart(2, '0') }}</span>
              <!-- flip: node labels flip up like a departures board -->
               <strong data-split="flip" :data-split-delay="index * 0.15">{{ focus.label }}</strong>
            </li>
          </ul>
        </div>
        <ol class="research__focus-list">
          <li v-for="focus in focusAreas" :key="`${focus.label}-detail`">
             <h3 data-split="maskRise">{{ focus.label }}</h3>
             <p data-split="fill">{{ focus.why }}</p>
            <ul v-if="focus.tags?.length" class="research__tags">
              <li v-for="tag in focus.tags" :key="tag" class="reveal-block">{{ tag }}</li>
            </ul>
          </li>
        </ol>
      </section>

    </div>
  </section>
</template>

<style scoped>
.research__label { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 15px; color: var(--muted); }
.research__published, .research__focus-section { margin-top: clamp(40px, 5.6vw, 76px); }
.research__article { max-width: 980px; padding: clamp(20px, 3.2vw, 44px) 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.research__article-meta { display: flex; flex-wrap: wrap; gap: 20px; color: var(--muted); }
.research__article h3 { max-width: 22ch; margin-top: 18px; font-size: clamp(30px, 4.5vw, 68px); letter-spacing: -.06em; line-height: .96; }
.research__summary { max-width: 58ch; margin-top: 22px; font-size: 18px; line-height: 1.55; }
.research__summary strong { display: block; margin-bottom: 7px; color: var(--accent); font: 11px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
.research__result { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 16px; max-width: 64ch; margin-top: 16px; padding-top: 13px; border-top: 1px solid var(--line); color: var(--muted); }
.research__result .mono { color: var(--ink); }
.research__article > .link-underline, .research__article > .pending { display: inline-block; margin-top: 24px; }
.research__article > .link-underline { color: var(--ink); }
.topic-map { position: relative; min-height: 200px; overflow: hidden; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 58%); }
.topic-map::before, .topic-map::after { content: ''; position: absolute; inset: 50% 8%; border-top: 1px solid color-mix(in oklab, var(--accent) 35%, transparent); transform: rotate(18deg); }
.topic-map::after { transform: rotate(-18deg); }
.topic-map ul { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; min-height: 200px; padding: 26px 4%; list-style: none; }
.topic-map li { display: grid; justify-items: center; gap: 10px; text-align: center; }
.topic-map li:nth-child(even) { transform: translateY(42px); }
.topic-map li::before { content: ''; width: 13px; height: 13px; border: 2px solid var(--accent); border-radius: 50%; background: var(--bg); box-shadow: 0 0 0 7px color-mix(in oklab, var(--accent) 10%, transparent); }
.topic-map__node-index { color: var(--accent); }
.topic-map li strong { max-width: 16ch; font-size: 14px; font-weight: 500; }
.topic-map__axis { position: absolute; z-index: 2; color: var(--muted); font-size: 9px; }
.topic-map__axis--one { top: 12px; left: 4%; }.topic-map__axis--two { top: 12px; left: 50%; }.topic-map__axis--three { right: 4%; bottom: 12px; }
.research__focus-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); list-style: none; padding: 0; margin: 34px 0 0; }
/* ">" so these rules only hit the focus items, not the tag <li>s nested inside them */
.research__focus-list > li { padding: 20px 0; border-top: 1px solid var(--line); }
.research__focus-list > li:nth-child(odd) { padding-right: clamp(20px, 5vw, 80px); }
.research__focus-list > li:nth-child(even) { padding-left: clamp(20px, 5vw, 80px); border-left: 1px solid var(--line); }
.research__focus-list h3 { font-size: clamp(21px, 2.2vw, 32px); }
.research__focus-list p { max-width: 48ch; margin-top: 10px; color: var(--muted); line-height: 1.55; }
.research__tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; list-style: none; padding: 0; }
.research__tags li { padding: 4px 7px; color: var(--muted); border: 1px solid var(--line); font: 10px var(--font-mono); }
@media (max-width: 700px) { .research__result { grid-template-columns: 1fr; gap: 7px; } .topic-map ul { grid-template-columns: repeat(2, 1fr); gap: 22px; } .topic-map li:nth-child(even) { transform: none; } .research__focus-list { grid-template-columns: 1fr; } .research__focus-list > li:nth-child(odd), .research__focus-list > li:nth-child(even) { padding-inline: 0; border-left: 0; } }
</style>
