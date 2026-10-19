<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const props = withDefaults(defineProps<{
  mobileDock?: boolean
  showCorner?: boolean
}>(), {
  mobileDock: false,
  showCorner: true,
})

type AnchorName = 'hero' | 'ask'
type Placement = 'anchor' | 'corner' | 'hidden'

const stageRef = ref<HTMLElement | null>(null)
const placement = ref<Placement>('hidden')
const anchorName = ref<AnchorName | null>(null)
const stage = reactive({ left: 0, top: 0, width: 0, height: 0 })
const isMobile = ref(false)
const anchors = new Map<AnchorName, HTMLElement>()
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let mutationObserver: MutationObserver | null = null
let scheduled = false
let placementFrame: number | null = null
let mounted = false

const stageStyle = computed<Record<string, string>>(() => {
  const corner = placement.value === 'corner'
  const fallbackWidth = 160
  const fallbackHeight = 220
  return {
    position: 'fixed',
    zIndex: '30',
    overflow: 'visible',
    boxSizing: 'border-box',
    left: `${stage.left}px`,
    top: `${stage.top}px`,
    width: `${stage.width || fallbackWidth}px`,
    height: `${stage.height || fallbackHeight}px`,
    maxWidth: corner ? 'calc(100vw - 24px)' : '100vw',
    maxHeight: corner ? 'calc(100vh - 24px)' : '100vh',
    opacity: placement.value === 'hidden' ? '0' : '1',
    pointerEvents: 'none',
    '--telebot-anchor': anchorName.value || 'corner',
    '--telebot-mode': placement.value,
    '--telebot-corner': corner ? '1' : '0',
  }
})

function updateViewportMode(): void {
  isMobile.value = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
}

function rememberAnchors(): void {
  if (typeof document === 'undefined') return
  const nextAnchors = new Map<AnchorName, HTMLElement>()
  ;(['hero', 'ask'] as AnchorName[]).forEach((name) => {
    const element = document.querySelector<HTMLElement>(`[data-telebot-anchor="${name}"]`)
    if (element) nextAnchors.set(name, element)
  })
  const changed = nextAnchors.size !== anchors.size
    || Array.from(nextAnchors.entries()).some(([name, element]) => anchors.get(name) !== element)
  if (!changed) return
  anchors.forEach((element, name) => {
    if (nextAnchors.get(name) === element) return
    resizeObserver?.unobserve(element)
    intersectionObserver?.unobserve(element)
  })
  nextAnchors.forEach((element, name) => {
    if (anchors.get(name) === element) return
    resizeObserver?.observe(element)
    intersectionObserver?.observe(element)
  })
  anchors.clear()
  nextAnchors.forEach((element, name) => anchors.set(name, element))
  schedulePlacement()
}

function onAnchorMutation(records: MutationRecord[]): void {
  const selector = '[data-telebot-anchor]'
  const anchorsChanged = records.some((record) => {
    if (stageRef.value?.contains(record.target)) return false
    if (record.type === 'attributes') return record.attributeName === 'data-telebot-anchor'
    return [...record.addedNodes, ...record.removedNodes].some(node => node instanceof HTMLElement
      && (node.matches(selector) || Boolean(node.querySelector(selector))))
  })
  if (anchorsChanged) rememberAnchors()
}

function schedulePlacement(): void {
  if (scheduled || !mounted) return
  scheduled = true
  placementFrame = requestAnimationFrame(() => {
    placementFrame = null
    scheduled = false
    placeStage()
  })
}

function visibleArea(element: HTMLElement): number {
  const rect = element.getBoundingClientRect()
  const width = Math.max(0, Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left))
  const height = Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top))
  return width * height
}

function placeStage(): void {
  if (!mounted || typeof window === 'undefined') return
  updateViewportMode()
  const ordered: AnchorName[] = ['hero', 'ask']
  const active = ordered
    .map(name => ({ name, element: anchors.get(name), area: anchors.get(name) ? visibleArea(anchors.get(name)!) : 0 }))
    .filter(item => item.element && item.area > 24)
    .sort((a, b) => b.area - a.area)[0]

  if (active?.element) {
    const rect = active.element.getBoundingClientRect()
    anchorName.value = active.name
    placement.value = 'anchor'
    stage.left = Math.round(rect.left)
    stage.top = Math.round(rect.top)
    stage.width = Math.max(1, Math.round(rect.width))
    stage.height = Math.max(1, Math.round(rect.height))
    return
  }

  anchorName.value = null
  if (isMobile.value && !props.mobileDock) {
    placement.value = 'hidden'
    return
  }
  if (!props.showCorner) {
    placement.value = 'hidden'
    return
  }
  placement.value = 'corner'
  const width = 160
  const height = 220
  stage.width = Math.round(width)
  stage.height = Math.round(height)
  // The quick Ask pill owns the lower-right corner; keep the compact MEG
  // on the opposite side so the two controls never cover each other.
  stage.left = isMobile.value
    ? Math.max(12, Math.round((window.innerWidth - width) / 2))
    : 16
  stage.top = Math.max(12, Math.round(window.innerHeight - height - 16))
}

function onScroll(): void { schedulePlacement() }

onMounted(() => {
  mounted = true
  updateViewportMode()
  resizeObserver = new ResizeObserver(schedulePlacement)
  intersectionObserver = new IntersectionObserver(schedulePlacement, { threshold: [0, .01, .25, .6, 1] })
  rememberAnchors()
  window.addEventListener('resize', schedulePlacement, { passive: true })
  window.addEventListener('scroll', onScroll, { passive: true })
  mutationObserver = new MutationObserver(onAnchorMutation)
  mutationObserver.observe(document.getElementById('main-content') || document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['data-telebot-anchor'],
  })
  schedulePlacement()
})

onBeforeUnmount(() => {
  mounted = false
  if (placementFrame !== null) cancelAnimationFrame(placementFrame)
  placementFrame = null
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  mutationObserver?.disconnect()
  window.removeEventListener('resize', schedulePlacement)
  window.removeEventListener('scroll', onScroll)
  anchors.clear()
})
</script>

<template>
  <aside
    ref="stageRef"
    class="persistent-telebot"
    :class="[`is-${placement}`, { 'has-anchor': anchorName, 'is-mobile': isMobile }]"
    :style="stageStyle"
    aria-label="Persistent MEG assistant"
  >
    <div class="persistent-telebot__surface">
      <Telebot3D :idle-motion="true" max-width="100%" />
    </div>
  </aside>
</template>

<style>
.persistent-telebot { position: fixed; z-index: 30; overflow: visible; transition: opacity .28s ease; contain: layout paint; }
.persistent-telebot__surface { width: 100%; height: 100%; display: grid; place-items: center; pointer-events: none; }
 .persistent-telebot__surface .tb3d__canvas, .persistent-telebot__surface .tb3d__channel { pointer-events: auto; }
 .persistent-telebot__surface .tb3d { width: 100%; height: 100%; min-height: 0; max-width: none !important; display: grid; grid-template-rows: minmax(0, 1fr) 1.35rem 1.8rem; align-content: stretch; overflow: hidden; }
 .persistent-telebot__surface .tb3d__stage { min-height: 0; height: auto; max-height: none; overflow: hidden; }
 .persistent-telebot__surface .tb3d__canvas { width: 100%; height: 100%; min-height: 0; max-height: none; object-fit: fill; }
.persistent-telebot.is-anchor { padding: clamp(0px, .7vw, 10px); }
.persistent-telebot.is-anchor .persistent-telebot__surface { pointer-events: auto; }
.persistent-telebot.is-corner { width: 160px; height: 220px; min-width: 0; min-height: 0; border-radius: 24px; background: color-mix(in oklab, var(--bg, #f5f1e9) 88%, transparent); box-shadow: 0 22px 70px color-mix(in oklab, #18213d 22%, transparent), 0 0 0 1px color-mix(in oklab, var(--ink, #17191d) 10%, transparent); backdrop-filter: blur(12px); }
.persistent-telebot.is-corner .persistent-telebot__surface { padding: 10px 12px 13px; pointer-events: auto; }
.persistent-telebot.is-hidden { visibility: hidden; }
@media (max-width: 720px) {
  .persistent-telebot.is-anchor { padding: 0; }
  .persistent-telebot.is-corner { width: 160px; height: 220px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px); }
  .persistent-telebot.is-mobile:not(.has-anchor) { display: none; }
}
@media (prefers-reduced-motion: reduce) { .persistent-telebot { transition: none; } }
</style>
