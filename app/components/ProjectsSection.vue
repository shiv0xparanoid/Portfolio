<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProjects } from '~/composables/usePortfolioContent'
import { useTelebot } from '~/composables/useTelebot'

const { items } = useProjects()
const tb = useTelebot()
const telebotWithPreview = tb as typeof tb & { setProjectPreview?: (id: string) => void }
const hoveredId = ref<string | null>(null)

function preview(id: string) {
  hoveredId.value = id
  telebotWithPreview.setProjectPreview?.(id)
}
function clearPreview() { hoveredId.value = null }
function displayLine(project: { subtitle?: string; solution: string }) { return project.subtitle || project.solution }
function visibleStack(stack: string[]) { return stack.filter(item => !item.startsWith('[PLACEHOLDER')).slice(0, 3) }
function displayYear(year: string) { return year.startsWith('[PLACEHOLDER') ? 'YEAR UNCONFIRMED' : year }
onMounted(() => tb.setChapterLabel('WORK'))
</script>

<template>
  <section id="ch7" class="chapter projects">
    <div class="container">
      <header class="section__head">
        <h2 class="d-120 section__title">Ideas, translated into <em class="emotional">experiences.</em></h2>
        <p class="section__lede">Spatial interfaces, creative tools, and AI systems. Different problems, one question: how can technology feel more natural to use?</p>
      </header>

      <div class="projects__gallery" role="list" aria-label="Selected project case studies">
        <NuxtLink
          v-for="(project, index) in items"
          :key="project.id"
          class="project-card"
          :class="{ 'project-card--featured': index === 0, 'is-previewing': hoveredId === project.id }"
          :to="`/projects/${project.id}`"
          role="listitem"
          @mouseenter="preview(project.id)"
          @mouseleave="clearPreview"
          @focus="preview(project.id)"
          @blur="clearPreview"
        >
          <div class="project-card__art" :class="`project-card__art--${project.id}`" aria-hidden="true">
            <div class="project-card__art-label mono"><span>VISUAL STUDY / {{ project.prjctId || `0${index + 1}` }}</span><span>CONCEPTUAL</span></div>
            <div v-if="project.id === 'holopad'" class="art-space">
              <div class="art-space__world-grid"></div>
              <div class="art-space__window"><span class="art-space__window-label mono">DEPTH FIELD / 01</span><span class="art-space__frame art-space__frame--back"></span><span class="art-space__frame art-space__frame--front"></span><span class="art-space__object"></span><span class="art-space__axis mono">X 034° · Z 012°</span></div>
              <div class="art-space__readout mono"><span>IMAGE → SPACE</span><span>WEBGL / REAL-TIME</span></div>
            </div>
            <div v-else-if="project.id === 'qvanta'" class="art-circuit">
              <div class="art-circuit__heading mono">QUBIT REGISTER <span>04 QUBITS</span></div>
              <div class="art-circuit__row"><b>q₀</b><i></i><span>H</span><i></i><span class="art-circuit__target">●</span><i></i><strong>M</strong></div>
              <div class="art-circuit__row"><b>q₁</b><i></i><span>X</span><i></i><span class="art-circuit__control">●</span><i></i><strong>M</strong></div>
              <div class="art-circuit__row"><b>q₂</b><i></i><span>H</span><i></i><span class="art-circuit__target">⊕</span><i></i><strong>M</strong></div>
              <div class="art-circuit__row"><b>q₃</b><i></i><span>R</span><i></i><span></span><i></i><strong>M</strong></div>
              <div class="art-circuit__footer mono"><span>STATE VECTOR</span><span>SIMULATION READY</span></div>
            </div>
            <div v-else-if="project.id === 'sketchify'" class="art-canvas">
              <div class="art-canvas__sheet"><span class="art-canvas__shape art-canvas__shape--one"></span><span class="art-canvas__shape art-canvas__shape--two"></span><span class="art-canvas__stroke art-canvas__stroke--one"></span><span class="art-canvas__stroke art-canvas__stroke--two"></span><span class="art-canvas__crop mono">FRAME / 01</span></div>
              <div class="art-canvas__tools mono"><span>BRUSH</span><span class="art-canvas__swatch"></span><span>LAYERS 03</span><span>EXPORT ↗</span></div>
            </div>
            <div v-else class="art-flow">
              <div class="art-flow__heading mono">RETRIEVAL / RESPONSE</div>
              <div class="art-flow__steps"><span>QUESTION</span><i>→</i><span>CONTEXT</span><i>→</i><span>ANSWER</span></div>
              <div class="art-flow__document"><b>01</b><span>RELEVANT SOURCE</span><i></i><i></i><i></i></div>
              <div class="art-flow__answer"><span class="mono">GROUNDED RESPONSE</span><b>Answer with context.</b><i>Source attached</i></div>
            </div>
          </div>
          <div class="project-card__copy">
            <div class="project-card__meta mono"><span>{{ project.prjctId || `PRJCT/${String(index + 1).padStart(2, '0')}` }}</span><span>{{ displayYear(project.year) }}</span></div>
            <div class="project-card__title-row"><h3>{{ project.title }}</h3><span class="project-card__arrow" aria-hidden="true">↗</span></div>
            <p class="project-card__description">{{ displayLine(project) }}</p>
            <div class="project-card__stack"><span v-for="tool in visibleStack(project.stack)" :key="tool">{{ tool }}</span></div>
          </div>
        </NuxtLink>
      </div>

    </div>
  </section>
</template>

<style scoped>
.projects__gallery { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(16px, 2vw, 28px); }
.project-card { display: grid; min-width: 0; color: var(--ink); text-decoration: none; }
.project-card--featured { grid-column: 1 / -1; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); align-items: stretch; }
.project-card__art { position: relative; display: grid; min-height: 300px; overflow: hidden; isolation: isolate; transition: transform .55s var(--ease-out); }
.project-card--featured .project-card__art { min-height: 440px; }
.project-card:hover .project-card__art, .project-card:focus-visible .project-card__art { transform: translateY(-5px); }
.project-card__art-label { position: absolute; z-index: 2; top: 18px; left: 20px; right: 20px; display: flex; justify-content: space-between; gap: 12px; color: currentColor; font-size: 9px; }
.project-card__copy { display: grid; align-content: start; padding: 16px 0 20px; border-bottom: 1px solid var(--line-strong); }
.project-card--featured .project-card__copy { align-content: center; padding: 28px clamp(22px, 4vw, 64px); border-bottom: 0; background: var(--bg-soft); }
.project-card__meta { display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 10px; }
.project-card__title-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 16px; }
.project-card__title-row h3 { font-size: clamp(32px, 4.6vw, 62px); line-height: .95; }
.project-card--featured .project-card__title-row h3 { font-size: clamp(48px, 7vw, 92px); }
.project-card__arrow { display: grid; place-items: center; flex: 0 0 38px; width: 38px; aspect-ratio: 1; border: 1px solid var(--line-strong); font-size: 18px; transition: background .25s ease, color .25s ease, transform .25s ease; }
.project-card:hover .project-card__arrow, .project-card:focus-visible .project-card__arrow { transform: translate(3px, -3px); background: var(--ink); color: var(--bg); }
.project-card__description { max-width: 42ch; margin-top: 13px; color: var(--muted); font-size: 15px; line-height: 1.55; }
.project-card__stack { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 20px; }
.project-card__stack span { padding: 5px 8px; border: 1px solid var(--line); color: var(--muted); font: 9px var(--font-mono); }

.art-space { position: relative; display: grid; place-items: center; min-height: 100%; overflow: hidden; color: #e8f1d3; background-color: #1e2825; background-image: linear-gradient(rgba(230,242,210,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(230,242,210,.055) 1px, transparent 1px); background-size: 34px 34px; }
.art-space__world-grid { position: absolute; inset: 44% -15% -45%; transform: perspective(440px) rotateX(62deg); background-image: linear-gradient(rgba(205,238,137,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(205,238,137,.22) 1px, transparent 1px); background-size: 44px 44px; }
.art-space__window { position: relative; display: grid; width: 58%; height: 62%; border: 1px solid rgba(225,239,201,.55); transform: perspective(900px) rotateY(-15deg) rotateX(4deg); box-shadow: 24px 22px 0 rgba(7,13,11,.26); }
.art-space__window-label, .art-space__axis { position: absolute; z-index: 1; padding: 8px 10px; background: #26342e; color: #d9f49d; font-size: 9px; }
.art-space__window-label { top: -14px; left: 14px; }.art-space__axis { right: -16px; bottom: 14px; }
.art-space__frame { position: absolute; display: block; border: 1px solid #d9f49d; }
.art-space__frame--back { inset: 18% 22% 22% 24%; transform: translate(34px,-18px); opacity: .42; }
.art-space__frame--front { inset: 18% 22% 22% 24%; }
.art-space__object { position: absolute; top: 32%; left: 42%; width: 24%; aspect-ratio: 1; transform: rotate(30deg) skew(-8deg,-8deg); border: 1px solid #d9f49d; background: linear-gradient(135deg, rgba(217,244,157,.6), rgba(217,244,157,.06) 64%); box-shadow: 18px 14px 0 rgba(217,244,157,.16); }
.art-space__readout { position: absolute; right: 22px; bottom: 20px; left: 22px; display: flex; justify-content: space-between; gap: 12px; color: rgba(232,241,211,.7); font-size: 9px; }
.art-circuit { display: grid; align-content: center; gap: 20px; padding: 60px clamp(18px, 4vw, 58px) 26px; color: #2a3028; background: #e7e1c9; background-image: radial-gradient(rgba(42,48,40,.1) .7px, transparent .7px); background-size: 8px 8px; }
.art-circuit__heading, .art-circuit__footer { display: flex; justify-content: space-between; gap: 10px; font-size: 9px; }
.art-circuit__row { display: grid; grid-template-columns: 24px 1fr 34px 1fr 34px 1fr 30px; gap: 5px; align-items: center; color: #64685c; }
.art-circuit__row > i { height: 1px; background: #777a6b; }.art-circuit__row > span, .art-circuit__row > strong { display: grid; place-items: center; width: 32px; aspect-ratio: 1; border: 1px solid #454b3c; color: #30372d; font: 12px var(--font-mono); }
.art-circuit__row > strong { background: #30372d; color: #e7e1c9; font-size: 9px; }.art-circuit__row .art-circuit__control, .art-circuit__row .art-circuit__target { width: 12px; height: 12px; justify-self: center; border: 0; color: #c05736; font-size: 16px; }
.art-circuit__footer { padding-top: 16px; border-top: 1px solid rgba(42,48,40,.25); color: #64685c; }
.art-canvas { display: grid; grid-template-rows: 1fr 36px; gap: 10px; padding: 58px 9% 24px; background: #d06952; color: #f7ede2; }
.art-canvas__sheet { position: relative; overflow: hidden; background: #e7b49e; }
.art-canvas__shape { position: absolute; display: block; }.art-canvas__shape--one { top: 10%; left: 18%; width: 46%; height: 72%; background: #d7d78a; clip-path: polygon(20% 0,100% 13%,82% 100%,0 83%); }
.art-canvas__shape--two { top: 28%; right: 14%; width: 34%; height: 48%; background: #405b56; clip-path: polygon(50% 0,100% 50%,50% 100%,0 50%); }
.art-canvas__stroke { position: absolute; display: block; height: 3px; background: #293c3a; transform: rotate(-24deg); }.art-canvas__stroke--one { top: 47%; left: 4%; width: 92%; }.art-canvas__stroke--two { top: 65%; left: 20%; width: 72%; transform: rotate(18deg); background: #c75f49; }
.art-canvas__crop { position: absolute; right: 14px; bottom: 12px; color: #283c38; font-size: 9px; }.art-canvas__tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; color: #1b1d20; font-size: 8px; }.art-canvas__tools.mono, .project-card__art--sketchify .project-card__art-label.mono { color: #1b1d20; }.art-canvas__swatch { width: 20px; aspect-ratio: 1; border: 1px solid rgba(247,237,226,.6); border-radius: 50%; background: #d7d78a; }
.art-flow { display: grid; align-content: center; gap: 30px; padding: 58px clamp(18px, 4vw, 48px) 28px; color: #f3f0e6; background: #304b4d; background-image: linear-gradient(rgba(243,240,230,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(243,240,230,.06) 1px, transparent 1px); background-size: 32px 32px; }
.art-flow__heading, .art-flow__steps, .art-flow__document, .art-flow__answer { font-size: 9px; }.art-flow__heading { color: #c8dc98; }.art-flow__steps { display: flex; justify-content: space-between; align-items: center; gap: 6px; }.art-flow__steps span { padding: 9px 10px; border: 1px solid rgba(243,240,230,.36); }.art-flow__steps i { color: #c8dc98; font-style: normal; }
.art-flow__document { display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding: 16px; border: 1px solid rgba(243,240,230,.24); color: #cbd1c7; }.art-flow__document b { grid-row: span 4; color: #c8dc98; font: 11px var(--font-mono); }.art-flow__document i { width: 88%; height: 1px; background: rgba(243,240,230,.32); }.art-flow__document i:last-child { width: 56%; }
.art-flow__answer { display: grid; gap: 9px; margin-left: 15%; padding: 15px 18px; background: #c8dc98; color: #253331; }.art-flow__answer .mono { font-size: 8px; }.art-flow__answer b { font: 19px var(--font-display); }.art-flow__answer i { font-style: normal; color: #466057; }

@media (max-width: 800px) { .project-card--featured { grid-template-columns: 1fr; }.project-card--featured .project-card__art { min-height: min(74vw, 380px); }.project-card--featured .project-card__copy { padding: 20px 0; background: transparent; }.project-card--featured .project-card__title-row h3 { font-size: clamp(44px, 10vw, 72px); } }
@media (max-width: 600px) { .projects__gallery { grid-template-columns: 1fr; gap: 12px; }.project-card__art { min-height: 260px; }.project-card--featured .project-card__art { min-height: 270px; }.project-card__copy { padding: 13px 0 18px; }.art-circuit { gap: 17px; }.art-circuit__row { grid-template-columns: 20px 1fr 28px 1fr 22px 1fr 24px; }.art-circuit__row > span, .art-circuit__row > strong { width: 27px; }.art-canvas { padding-inline: 7%; }.art-flow__steps span { padding-inline: 6px; font-size: 8px; } }
</style>
