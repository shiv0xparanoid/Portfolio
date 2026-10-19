<script setup lang="ts">
import { projects } from '~/data/content.ts'
import { ref, onBeforeUnmount } from 'vue'
import { useSplitReveal } from '~/composables/useSplitReveal'
import { useReveal } from '~/composables/useReveal'

const sectionRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const cardsRef = ref<HTMLElement | null>(null)

// letters / words: everything with data-split="..." inside this section
useSplitReveal(sectionRef)
// whole blocks: the "More about us" link and the project cards
// (note: the option is called staggerMs, not stagger)
useReveal(headerRef, { staggerMs: 80, selector: '.reveal-block' })
useReveal(cardsRef, { staggerMs: 120, selector: '.project-card-wrapper', threshold: 0.1 })

interface ProjectCardState {
  hovered: boolean
  rotateX: number
  rotateY: number
}

const cardStates = ref<Map<number, ProjectCardState>>(new Map())
projects.forEach(p => {
  cardStates.value.set(p.id, { hovered: false, rotateX: 0, rotateY: 0 })
})

const rafIds = ref<Map<number, number>>(new Map())
const targetRotations = ref<Map<number, { x: number; y: number }>>(new Map())
projects.forEach(p => targetRotations.value.set(p.id, { x: 0, y: 0 }))

const handleCardMouseMove = (e: MouseEvent, projectId: number) => {
  const el = e.currentTarget as HTMLElement
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width
  const y = (e.clientY - rect.top) / rect.height
  const rotateY = (x - 0.5) * 3
  const rotateX = (0.5 - y) * 3
  const t = targetRotations.value.get(projectId)
  if (t) {
    t.x = rotateX
    t.y = rotateY
  }
}

const handleCardMouseEnter = (projectId: number) => {
  const state = cardStates.value.get(projectId)
  if (state) state.hovered = true
  const el = document.querySelector(`[data-project-id="${projectId}"]`) as HTMLElement
  if (!el) return
  let currentX = 0, currentY = 0
  const animate = () => {
    const t = targetRotations.value.get(projectId)
    if (t) {
      currentX += (t.x - currentX) * 0.1
      currentY += (t.y - currentY) * 0.1
      const s = cardStates.value.get(projectId)
      const scale = s?.hovered ? 1.01 : 1
      el.style.transform = `perspective(1200px) rotateX(${currentX}deg) rotateY(${currentY}deg) scale(${scale})`
    }
    rafIds.value.set(projectId, requestAnimationFrame(animate))
  }
  animate()
}

const handleCardMouseLeave = (projectId: number) => {
  const state = cardStates.value.get(projectId)
  if (state) {
    state.hovered = false
  }
  const t = targetRotations.value.get(projectId)
  if (t) {
    t.x = 0
    t.y = 0
  }
  const rafId = rafIds.value.get(projectId)
  if (rafId !== undefined) {
    cancelAnimationFrame(rafId)
    rafIds.value.delete(projectId)
  }
}

onBeforeUnmount(() => {
  rafIds.value.forEach(id => cancelAnimationFrame(id))
  rafIds.value.clear()
})
</script>

<template>
  <section id="ch7" ref="sectionRef" class="work-section">
    <div class="container">
      <div class="work-header" ref="headerRef">
        <div class="header-left">
          <!-- flip: letters flip up like a departures board -->
          <span class="eyebrow" data-split="flip">03 / Selected Work</span>
          <!-- slide: "Selected" comes from the left, "Work" from the right (echoes the zig-zag cards) -->
          <h2 data-split="slide" data-split-delay="0.15">Selected Work</h2>
        </div>
        <a href="#" class="more-cta reveal-block">More about us ↪</a>
      </div>

      <div class="projects-list" ref="cardsRef">
        <div
          v-for="(project, index) in projects"
          :key="project.id"
          class="project-card-wrapper"
          :class="{ 'is-right': index % 2 === 1 }"
        >
          <a
            href="#"
            class="project-card"
            :data-project-id="project.id"
            @mousemove="(e) => handleCardMouseMove(e, project.id)"
            @mouseenter="() => handleCardMouseEnter(project.id)"
            @mouseleave="() => handleCardMouseLeave(project.id)"
          >
            <div
              class="project-bg"
              :style="{ backgroundColor: project.color, opacity: 0.3 }"
            ></div>
            <div class="project-inner">
              <div class="project-info" :class="{ 'info-right': index % 2 === 1 }">
                <!-- scramble: the year shuffles into place -->
                <span v-once class="project-year" data-split="scramble">{{ project.year }}</span>
                <!-- maskRise: big title rises out of a mask -->
                <h3 v-once class="project-title" data-split="maskRise">{{ project.title }}</h3>
                <!-- blurFocus: calm one-liner comes into focus -->
                <p v-once class="project-subtitle" data-split="blurFocus" data-split-delay="0.2">{{ project.subtitle }}</p>
                <div class="project-tags">
                  <span
                    v-for="tag in project.tags"
                    :key="tag"
                    class="tag-pill"
                  >{{ tag }}</span>
                </div>
                <span class="view-link">
                  <span class="view-text">View project</span>
                  <span class="view-arrow">↪</span>
                </span>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.work-section {
  min-height: 100vh;
  padding: 160px 0;
  position: relative;
  background: var(--bg);
}

.work-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 100px;
  position: relative;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.eyebrow {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.work-header h2 {
  font-family: var(--serif);
  font-weight: 300;
  font-size: 8vw;
  line-height: 0.95;
  color: var(--text);
  letter-spacing: -0.02em;
}

.more-cta {
  font-family: var(--serif);
  font-size: 18px;
  font-weight: 300;
  color: var(--text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(26, 26, 46, 0.3);
  transition: border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1), color 0.4s ease;
  margin-bottom: 12px;
}

.more-cta:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.project-card-wrapper {
  width: 100%;
}

.project-card {
  position: relative;
  width: 88%;
  min-height: 520px;
  border-radius: 24px;
  overflow: hidden;
  display: block;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
  transform-style: preserve-3d;
  will-change: transform;
}

.project-card-wrapper.is-right .project-card {
  margin-left: auto;
}

.project-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.project-card:hover .project-bg {
  transform: scale(1.04);
}

.project-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: 520px;
  padding: 60px;
  display: flex;
  align-items: center;
}

.project-info {
  max-width: 560px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.project-info.info-right {
  margin-left: auto;
  text-align: right;
  align-items: flex-end;
}

.project-year {
  font-family: var(--mono);
  font-size: 14px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
}

.project-title {
  font-family: var(--serif);
  font-weight: 300;
  font-size: 5vw;
  line-height: 1;
  color: var(--text);
  letter-spacing: -0.02em;
}

.project-subtitle {
  font-family: var(--sans);
  font-size: 17px;
  font-weight: 400;
  color: var(--text-muted);
  letter-spacing: -0.005em;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.project-info.info-right .project-tags {
  justify-content: flex-end;
}

.tag-pill {
  font-family: var(--mono);
  font-size: 12px;
  padding: 8px 18px;
  border: 1px solid rgba(26, 26, 46, 0.2);
  border-radius: 999px;
  color: var(--text);
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
}

.view-link {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  font-family: var(--serif);
  font-size: 18px;
  color: var(--text);
  font-weight: 300;
}

.view-arrow {
  display: inline-block;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 20px;
}

.project-card:hover .view-arrow {
  transform: translateX(10px);
}

@media (max-width: 900px) {
  .work-section {
    padding: 100px 0;
  }
  .work-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 30px;
    margin-bottom: 60px;
  }
  .work-header h2 {
    font-size: 64px;
  }
  .project-card {
    width: 100%;
    min-height: 420px;
  }
  .project-inner {
    min-height: 420px;
    padding: 40px;
  }
  .project-title {
    font-size: 42px;
  }
}
</style>