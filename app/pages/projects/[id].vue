<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioContent } from '~/composables/usePortfolioContent'

const route = useRoute()
const content = usePortfolioContent()
const project = computed(() => content.projects.find(item => item.id === String(route.params.id)))

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project signal lost' })
}

const safeLinks = computed(() => (project.value?.links || []).filter(link =>
  !link.confirmNeeded && link.href && !link.href.startsWith('[PLACEHOLDER') && /^https?:\/\//i.test(link.href)
))

useSeoMeta({
  title: () => project.value ? `${project.value.title} — Shivang Sagar` : 'Project signal lost — Shivang Sagar',
  description: () => project.value?.solution || 'A project case study from Shivang Sagar.',
  ogTitle: () => project.value ? `${project.value.title} — Shivang Sagar` : 'Project signal lost',
  ogDescription: () => project.value?.solution || 'A project case study from Shivang Sagar.',
})
</script>

<template>
  <main v-if="project" class="case-study">
    <div class="container case-study__topline">
      <NuxtLink to="/#ch7" class="case-study__back mono"><span aria-hidden="true">←</span><span>Work index</span></NuxtLink>
      <div class="case-study__topline-meta mono">
        <span>Case study</span>
        <span>{{ project.prjctId }} · {{ project.year }}</span>
      </div>
    </div>

    <div class="container case-study__hero">
      <div class="case-study__hero-rule" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="case-study__hero-grid">
        <div class="case-study__hero-main">
          <p class="mono case-study__eyebrow"><span>Selected work</span><span aria-hidden="true"> / </span><span>{{ project.type }}</span></p>
          <h1>{{ project.title }}</h1>
          <p class="case-study__dek">{{ project.solution }}</p>
        </div>

        <aside class="case-study__hero-signal" aria-label="Project signal">
          <div class="case-study__hero-signal-head mono"><span>Project signal</span><span aria-hidden="true">↘</span></div>
          <strong>{{ project.prjctId }}</strong>
          <p>{{ project.scope }}</p>
          <div class="case-study__hero-signal-foot mono"><span>Built / {{ project.year }}</span><span>01—04</span></div>
        </aside>
      </div>
    </div>

    <div class="container case-study__grid">
      <aside class="case-study__meta">
        <div class="case-study__meta-index"><span class="mono">Project index</span><strong>{{ project.prjctId }}</strong><p>{{ project.year }}</p></div>
        <div><span class="mono">Role</span><strong>{{ project.role }}</strong></div>
        <div><span class="mono">Stack</span><ul><li v-for="item in project.stack" :key="item">{{ item }}</li></ul></div>
        <div v-if="safeLinks.length"><span class="mono">Public links</span><a v-for="link in safeLinks" :key="link.href" :href="link.href" target="_blank" rel="noopener noreferrer">{{ link.label }} <span aria-hidden="true">↗</span></a></div>
        <p v-else class="mono pending">Links pending confirmation.</p>
      </aside>

      <article class="case-study__body">
        <section class="case-study__section">
          <div class="case-study__section-head"><span class="case-study__section-index mono">01</span><p class="mono">Problem</p></div>
          <div class="case-study__section-copy"><p>{{ project.problem }}</p></div>
        </section>

        <section class="case-study__section">
          <div class="case-study__section-head"><span class="case-study__section-index mono">02</span><p class="mono">Three decisions</p></div>
          <ol class="case-study__decisions">
            <li v-for="(decision, index) in project.keyDecisions" :key="decision"><span class="case-study__decision-index mono">0{{ index + 1 }}</span><span>{{ decision }}</span></li>
          </ol>
        </section>

        <section class="case-study__section">
          <div class="case-study__section-head"><span class="case-study__section-index mono">03</span><p class="mono">Outcome</p></div>
          <div class="case-study__outcome">
            <div class="case-study__outcome-head"><span class="mono">Signal captured</span><strong>{{ project.outcome.metric }}</strong></div>
            <div class="case-study__outcome-compare">
              <p><span class="mono">Before</span><span>{{ project.outcome.before }}</span></p>
              <p><span class="mono">After</span><span>{{ project.outcome.after }}</span></p>
            </div>
            <p class="mono pending">{{ project.outcome.source?.startsWith('[PLACEHOLDER') ? 'Source pending confirmation.' : project.outcome.source }}</p>
          </div>
        </section>

        <section class="case-study__section case-study__media">
          <div class="case-study__section-head"><span class="case-study__section-index mono">04</span><p class="mono">Media</p></div>
          <div class="case-study__media-grid">
            <div v-for="(item, index) in project.media" :key="item.id || item.src" class="case-study__media-item">
              <div class="case-study__media-placeholder">
                <div class="case-study__media-topline mono"><span>Media / 0{{ index + 1 }}</span><span>Pending</span></div>
                <span class="case-study__media-mark" aria-hidden="true">+</span>
                <small>{{ item.alt }}</small>
              </div>
            </div>
          </div>
        </section>
      </article>
    </div>

    <footer class="container case-study__footer">
      <div class="case-study__footer-intro"><span class="mono">Continue the thread</span><p>One project is a signal. The next conversation is where it becomes a system.</p></div>
      <div class="case-study__footer-links">
        <NuxtLink to="/#ch9" class="case-study__footer-link"><span>Ask MEG about the work</span><span aria-hidden="true">↗</span></NuxtLink>
        <NuxtLink to="/#ch10" class="case-study__footer-link"><span>Start a conversation</span><span aria-hidden="true">↗</span></NuxtLink>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.case-study {
  position: relative;
  min-height: 100vh;
  overflow: clip;
  padding: 112px 0 100px;
  background:
    radial-gradient(circle at 82% -8%, color-mix(in oklab, var(--accent) 11%, transparent), transparent 34rem),
    linear-gradient(180deg, var(--bg-elev) 0%, var(--bg) 30%, var(--bg) 100%);
}

.case-study::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  opacity: .28;
  background-image: linear-gradient(to right, color-mix(in oklab, var(--line) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--line) 55%, transparent) 1px, transparent 1px);
  background-size: 96px 96px;
  mask-image: linear-gradient(to bottom, black, transparent 64%);
}

.case-study > * { position: relative; z-index: 1; }

.case-study__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 56px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.case-study__back,
.case-study__topline-meta,
.case-study__hero-signal-head,
.case-study__hero-signal-foot {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.case-study__back { color: var(--ink); transition: color var(--dur-s) var(--ease-out); }
.case-study__back:hover { color: var(--accent); }
.case-study__topline-meta { gap: 18px; color: var(--muted); }
.case-study__topline-meta span + span { color: var(--ink); }

.case-study__hero {
  padding-block: clamp(80px, 13vw, 190px) clamp(80px, 10vw, 150px);
}

.case-study__hero-rule {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 10px;
  margin-bottom: clamp(32px, 5vw, 72px);
}

.case-study__hero-rule span { height: 1px; background: var(--line-strong); }
.case-study__hero-rule span:nth-child(2) { background: var(--accent); }

.case-study__hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, .34fr);
  gap: clamp(48px, 9vw, 160px);
  align-items: end;
}

.case-study__hero-main { min-width: 0; }
.case-study__eyebrow { display: flex; flex-wrap: wrap; gap: 8px; color: var(--accent); }
.case-study h1 { max-width: 8ch; margin-top: 28px; font-size: clamp(72px, 16vw, 240px); letter-spacing: -.085em; line-height: .78; text-wrap: balance; }
.case-study__dek { max-width: 58ch; margin-top: clamp(36px, 6vw, 80px); font-size: clamp(20px, 2vw, 30px); line-height: 1.35; }

.case-study__hero-signal {
  display: flex;
  min-height: 250px;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  background: linear-gradient(145deg, color-mix(in oklab, var(--accent-soft) 48%, var(--surface)), var(--surface));
  box-shadow: var(--shadow-2);
}

.case-study__hero-signal-head,
.case-study__hero-signal-foot { justify-content: space-between; color: var(--muted); }
.case-study__hero-signal > strong { margin-top: 32px; color: var(--accent); font-size: clamp(48px, 6vw, 92px); font-weight: 500; letter-spacing: -.08em; line-height: .9; }
.case-study__hero-signal > p { max-width: 22ch; margin-top: 18px; color: var(--ink); font-size: 17px; line-height: 1.35; }
.case-study__hero-signal-foot { margin-top: auto; padding-top: 30px; border-top: 1px solid var(--line); }

.case-study__grid {
  display: grid;
  grid-template-columns: minmax(220px, .55fr) minmax(0, 1.45fr);
  gap: clamp(40px, 10vw, 170px);
  border-top: 1px solid var(--line);
}

.case-study__meta {
  position: sticky;
  top: 32px;
  display: grid;
  align-content: start;
  gap: 28px;
  padding-top: 22px;
}

.case-study__meta > div { display: grid; gap: 9px; border-top: 1px solid var(--line); padding-top: 12px; }
.case-study__meta-index { padding: 18px !important; border: 1px solid var(--line-strong) !important; border-radius: var(--r-md); background: color-mix(in oklab, var(--surface) 78%, transparent); }
.case-study__meta-index strong { margin-top: 6px; color: var(--accent); font-size: 30px; font-weight: 500; letter-spacing: -.06em; }
.case-study__meta-index p { color: var(--muted); font: 12px var(--font-mono); letter-spacing: var(--ls-mono); }
.case-study__meta strong { font-size: 16px; font-weight: 500; }
.case-study__meta ul { display: flex; flex-wrap: wrap; gap: 7px; list-style: none; }
.case-study__meta li { padding: 6px 8px; border: 1px solid var(--line); border-radius: var(--r-sm); color: var(--muted); font: 10px var(--font-mono); line-height: 1.2; }
.case-study__meta a { color: var(--accent); font-size: 14px; transition: color var(--dur-s) var(--ease-out); }
.case-study__meta a:hover { color: var(--accent-emph); }

.case-study__section {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: clamp(24px, 5vw, 72px);
  padding: clamp(44px, 7vw, 92px) 0;
  border-bottom: 1px solid var(--line);
}

.case-study__section-head { display: flex; align-items: flex-start; gap: 10px; }
.case-study__section-head p { color: var(--muted); }
.case-study__section-index { color: var(--accent); }
.case-study__section-copy p { max-width: 62ch; font-size: clamp(19px, 2vw, 28px); line-height: 1.45; }

.case-study__decisions { display: grid; max-width: 62ch; padding: 0; list-style: none; }
.case-study__decisions li { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 18px; padding: 20px 0; border-top: 1px solid var(--line); font-size: clamp(18px, 1.7vw, 24px); line-height: 1.45; }
.case-study__decisions li:first-child { padding-top: 0; border-top: 0; }
.case-study__decision-index { padding-top: 4px; color: var(--accent); }

.case-study__outcome {
  display: grid;
  gap: 24px;
  max-width: 62ch;
  padding: clamp(24px, 4vw, 40px);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  background: linear-gradient(145deg, color-mix(in oklab, var(--accent-soft) 36%, var(--surface)), var(--surface));
  box-shadow: var(--shadow-2);
}

.case-study__outcome-head { display: grid; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--line); }
.case-study__outcome-head .mono { color: var(--muted); }
.case-study__outcome strong { color: var(--accent); font-size: clamp(26px, 3vw, 42px); font-weight: 500; letter-spacing: -.04em; line-height: 1.05; }
.case-study__outcome-compare { display: grid; gap: 16px; }
.case-study__outcome-compare p { display: grid; grid-template-columns: 70px 1fr; gap: 14px; margin: 0; color: var(--muted); font-size: 15px; line-height: 1.45; }
.case-study__outcome-compare .mono { color: var(--ink); }
.case-study__outcome > .pending { padding-top: 18px; border-top: 1px solid var(--line); }

.case-study__media-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.case-study__media-item { min-width: 0; }
.case-study__media-placeholder { display: flex; min-height: 220px; flex-direction: column; justify-content: space-between; gap: 24px; padding: 18px; border: 1px dashed var(--line-strong); border-radius: var(--r-md); color: var(--warm); background: repeating-linear-gradient(135deg, transparent 0 12px, color-mix(in oklab, var(--warm) 6%, transparent) 12px 13px); }
.case-study__media-topline { display: flex; justify-content: space-between; gap: 12px; color: var(--warm); }
.case-study__media-mark { color: var(--warm); font-size: clamp(52px, 7vw, 96px); font-weight: 300; line-height: .7; }
.case-study__media-placeholder small { max-width: 34ch; color: var(--muted); font: 12px var(--font-mono); line-height: 1.5; }

.case-study__footer { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: clamp(40px, 10vw, 160px); padding-top: 40px; }
.case-study__footer-intro { display: grid; align-content: start; gap: 14px; }
.case-study__footer-intro p { max-width: 32ch; color: var(--muted); font-size: 15px; line-height: 1.5; }
.case-study__footer-links { display: grid; }
.case-study__footer-link { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 0; border-top: 1px solid var(--line); color: var(--ink); font-size: clamp(18px, 2vw, 26px); transition: color var(--dur-s) var(--ease-out), padding var(--dur-s) var(--ease-out); }
.case-study__footer-link:last-child { border-bottom: 1px solid var(--line); }
.case-study__footer-link:hover { padding-inline: 10px; color: var(--accent); }

.pending { color: var(--warm); }

@media (max-width: 900px) {
  .case-study__hero-grid { grid-template-columns: 1fr; gap: 48px; }
  .case-study__hero-signal { max-width: 520px; }
  .case-study__grid { grid-template-columns: 1fr; gap: 0; }
  .case-study__meta { position: static; padding-bottom: 32px; }
  .case-study__section { grid-template-columns: 110px minmax(0, 1fr); }
}

@media (max-width: 640px) {
  .case-study { padding-top: 84px; }
  .case-study__topline { align-items: flex-start; flex-direction: column; gap: 10px; }
  .case-study__topline-meta { justify-content: space-between; width: 100%; font-size: 10px; }
  .case-study__hero-rule { grid-template-columns: 1fr 1fr 1fr; }
  .case-study h1 { font-size: clamp(62px, 20vw, 112px); }
  .case-study__dek { font-size: 20px; }
  .case-study__section { grid-template-columns: 1fr; gap: 18px; }
  .case-study__section-head { align-items: center; }
  .case-study__media-grid { grid-template-columns: 1fr; }
  .case-study__footer { grid-template-columns: 1fr; gap: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .case-study__back,
  .case-study__meta a,
  .case-study__footer-link { transition: none; }
}
</style>
