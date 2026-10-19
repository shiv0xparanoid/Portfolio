<script setup lang="ts">
import { computed } from 'vue'
import { useBio, useMusic, usePress, useTalks } from '~/composables/usePortfolioContent'

const bio = useBio()
const press = usePress()
const talks = useTalks()
const music = useMusic()
const timeline = computed(() => bio.timeline ?? [])
const tools = computed(() => bio.research_focus ?? [])
const year = new Date().getFullYear()
const hasWriting = computed(() => press.items.length > 0 || talks.items.length > 0)
</script>

<template>
  <section id="extras" class="extras">
    <div class="container">
      <header class="extras__header">
        <div class="extras__header-meta mono"><span>EXTRAS / NOTES FROM THE WORKBENCH</span><span>ARCHIVE / 05</span></div>
        <div class="extras__header-row">
          <h2>Still becoming <em class="emotional">useful.</em></h2>
          <p class="extras__header-note">A small archive of the things that keep the work human: the questions, the tools, the unfinished edges, and the songs between builds.</p>
        </div>
      </header>

      <div class="extras__sections">
        <section class="extras__section" aria-labelledby="timeline-title">
          <div class="extras__section-title"><span id="timeline-title" class="mono">Timeline</span><span class="mono">A</span></div>
          <ol class="timeline">
            <li v-for="entry in timeline" :key="`${entry.year}-${entry.label}`"><span class="mono">{{ entry.year }}</span><div><h3>{{ entry.label }}</h3><p>{{ entry.note }}</p></div></li>
          </ol>
        </section>

        <section class="extras__section" aria-labelledby="tools-title">
          <div class="extras__section-title"><span id="tools-title" class="mono">Tools / questions</span><span class="mono">B</span></div>
          <ul class="tools-list">
            <li v-for="focus in tools" :key="focus.label"><span>{{ focus.label }}</span><p>{{ focus.why }}</p></li>
          </ul>
        </section>

        <section class="extras__section" aria-labelledby="writing-title">
          <div class="extras__section-title"><span id="writing-title" class="mono">Writing / talks</span><span class="mono">C</span></div>
          <div v-if="hasWriting" class="writing-list">
            <div v-for="item in press.items" :key="item.id"><span class="mono">{{ item.date }}</span><span>{{ item.headline }} / {{ item.outlet }}</span></div>
            <div v-for="item in talks.items" :key="item.id"><span class="mono">{{ item.year }}</span><span>{{ item.title }} / {{ item.event }}</span></div>
          </div>
          <p v-else class="mono pending">No additional writing or talks are recorded yet.</p>
        </section>

        <section class="extras__section" aria-labelledby="experiments-title">
          <div class="extras__section-title"><span id="experiments-title" class="mono">Experiments</span><span class="mono">D</span></div>
          <p class="extras__experiment">{{ bio.one_sentence || bio.tagline }}</p>
          <p class="mono extras__fine">The archive stays close to the source data. New experiments appear when they have something real to show.</p>
        </section>

        <section class="extras__section extras__music" aria-labelledby="music-title">
          <div class="extras__section-title"><span id="music-title" class="mono">Music / three releases</span><span class="mono">E</span></div>
          <div class="extras__music-head">
            <div>
              <p class="extras__music-count">{{ String(music.tracks.length).padStart(2, '0') }}</p>
              <p class="mono extras__music-note">songs released so far</p>
            </div>
            <p class="extras__music-copy">A quieter thread in the workbench: three songs, released under the same name that builds the interfaces.</p>
          </div>
          <MusicReleases />
        </section>
      </div>

      <footer class="extras__footer mono"><span>© {{ year }} {{ bio.name }}</span><span>Nuxt / Three / GSAP / Lenis</span><span>Made with attention</span></footer>
    </div>
  </section>
</template>

<style scoped>
.extras {
  position: relative;
  overflow: hidden;
  padding: clamp(72px, 9vw, 148px) 0 28px;
  border-top: 1px solid var(--line-strong);
  background:
    radial-gradient(circle at 92% 8%, color-mix(in srgb, var(--accent-soft) 58%, transparent), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--bg-soft) 42%, var(--bg)), var(--bg) 34%);
}
.extras::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  opacity: .28;
  background-image: linear-gradient(90deg, transparent 0 49.9%, var(--line) 50%, transparent 50.1%);
  background-size: 25% 100%;
}
.extras > .container { position: relative; z-index: 1; }
.extras__header { display: grid; gap: 22px; padding-bottom: clamp(42px, 6vw, 92px); }
.extras__header-meta { display: flex; justify-content: space-between; gap: 18px; color: var(--accent); }
.extras__header-meta span:last-child { color: var(--muted); }
.extras__header-row { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(220px, .8fr); gap: clamp(28px, 8vw, 140px); align-items: end; }
.extras__header h2 { max-width: 10ch; font-size: clamp(58px, 9vw, 146px); letter-spacing: -.08em; line-height: .82; }
.extras__header em { color: var(--accent); }
.extras__header-note { max-width: 32ch; padding-bottom: 7px; color: var(--muted); font-size: 15px; line-height: 1.55; }

.extras__sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.extras__section {
  min-width: 0;
  padding: 20px 22px 34px;
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 58%, transparent);
  box-shadow: 0 18px 48px -40px var(--ink);
  transition: border-color var(--dur-m) var(--ease-out), transform var(--dur-m) var(--ease-out), background var(--dur-m) var(--ease-out);
}
.extras__section:not(.extras__music):hover { border-color: var(--line-strong); background: color-mix(in srgb, var(--surface) 86%, transparent); transform: translateY(-3px); }
.extras__section-title { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 13px; border-bottom: 1px solid var(--line); color: var(--muted); }
.extras__section-title > .mono:last-child { color: var(--accent); }
.timeline, .tools-list, .writing-list { margin-top: 17px; list-style: none; }
.timeline li { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 16px; padding: 13px 0; border-bottom: 1px solid var(--line); }
.timeline li > .mono { color: var(--accent); }
.timeline h3 { font-size: 19px; }
.timeline p { margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.45; }
.tools-list li { padding: 13px 0; border-bottom: 1px solid var(--line); }
.tools-list li > span { font-size: 20px; }
.tools-list p { margin-top: 6px; color: var(--muted); font-size: 13px; line-height: 1.45; }
.writing-list div { display: grid; grid-template-columns: 100px 1fr; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--line); font-size: 14px; }
.writing-list .mono { color: var(--accent); }
.pending { color: var(--warm); }
.extras__experiment { max-width: 40ch; margin-top: 30px; font: italic clamp(24px, 3.2vw, 40px)/1.06 var(--font-serif); }
.extras__fine { max-width: 46ch; margin-top: 24px; color: var(--muted); line-height: 1.5; }

.extras__music {
  --bg: #17191d;
  --bg-soft: #22252a;
  --bg-elev: #292d33;
  --surface: #20242a;
  --text: #f2efe8;
  --text-muted: #b3b5b7;
  --ink: var(--text);
  --muted: var(--text-muted);
  --line: rgba(245, 243, 238, .13);
  --line-strong: rgba(245, 243, 238, .28);
  --accent: #a9c0ff;
  --accent-soft: #27365c;
  --accent-emph: #c1d2ff;
  --shadow-2: 0 30px 80px -42px rgba(0, 0, 0, .82);
  grid-column: 1 / -1;
  overflow: hidden;
  padding: clamp(26px, 4vw, 56px);
  border-color: rgba(245, 243, 238, .18);
  border-radius: 4px;
  background:
    radial-gradient(circle at 84% 20%, rgba(169, 192, 255, .16), transparent 27%),
    linear-gradient(135deg, #20242a, #15171a 72%);
  color: var(--text);
  box-shadow: 0 32px 90px -54px rgba(0, 0, 0, .9);
}
.extras__music .extras__section-title { border-color: rgba(245, 243, 238, .18); }
.extras__music .extras__section-title > .mono:last-child { color: var(--accent); }
.extras__music-head { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(0, 1.3fr); gap: clamp(24px, 7vw, 132px); align-items: end; margin-top: clamp(22px, 3vw, 38px); }
.extras__music-count { color: var(--accent); font: 500 clamp(88px, 14vw, 210px)/.72 var(--font-display); letter-spacing: -.09em; }
.extras__music-note { margin-top: 12px; color: var(--text-muted); }
.extras__music-copy { max-width: 38ch; padding-bottom: 8px; color: var(--text); font: italic clamp(24px, 3.2vw, 42px)/1.04 var(--font-serif); }

.extras__footer { display: flex; justify-content: space-between; gap: 20px; padding-top: 18px; color: var(--muted); }
.extras__footer span:nth-child(2) { color: var(--accent); }

@media (max-width: 720px) {
  .extras__header-row { grid-template-columns: 1fr; gap: 24px; }
  .extras__sections { grid-template-columns: 1fr; gap: 12px; }
  .extras__music { grid-column: auto; padding: 20px 16px 24px; }
  .extras__music-head { grid-template-columns: 1fr; gap: 18px; }
  .extras__footer { display: grid; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .extras__section:not(.extras__music):hover { transform: none; }
}
</style>
