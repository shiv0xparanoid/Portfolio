<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTelebot, type TelebotChannel } from '~/composables/useTelebot'
import { useBio, usePortfolioContent } from '~/composables/usePortfolioContent'
import type { ScreenMediaItem, ScreenProject } from '~/three/ScreenReel'

const props = withDefaults(defineProps<{
  width?: number
  height?: number
  maxWidth?: string
  idleMotion?: boolean
  media?: ScreenMediaItem[]
  name?: string
  role?: string
  quality?: 'low' | 'high'
}>(), {
  width: 460,
  height: 600,
  idleMotion: true,
  quality: 'high',
})

const emit = defineEmits<{
  (event: 'ready'): void
  (event: 'media-change', item: ScreenMediaItem | null, index: number): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(true)
const fallback = ref(false)
const reducedMotion = ref(false)
const visible = ref(true)
const reelPaused = ref(false)
const appSettings = inject<any>('appSettings', null)
const currentQuality = ref<'low' | 'high'>(appSettings?.settings?.quality === 'low' ? 'low' : props.quality)
const drawCalls = ref(-1)
const triCount = ref(-1)
const errorMessage = ref('')
const reelCaption = ref('')

const tb = useTelebot()
const { state } = tb
const portfolio = usePortfolioContent()
const bio = useBio()

let controller: import('~/three/TelebotScene').TelebotSceneController | null = null
let animationFrame: number | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let qualityObserver: MediaQueryList | null = null
let destroyed = false
let lowFpsFrames = 0
let lastFrame = 0
let slowFrameBudget = 0
let allocatedSize = { width: 0, height: 0 }
let reelPauseReason: 'user' | 'auto' | 'reduced-motion' | null = null
let reelPauseTimer: ReturnType<typeof setTimeout> | null = null
let reelPauseKey = ''

const media = computed<ScreenMediaItem[]>(() => {
  const source = [
    ...(portfolio.media?.items || []),
    ...portfolio.projects.flatMap(project => project.media || []),
    ...(props.media || []),
  ]
  const seen = new Set<string>()
  return source.filter((item) => {
    if (!item || !['image', 'video'].includes(item.type) || !item.src || item.confirmNeeded || item.verification === 'placeholder') return false
    if (/\[?placeholder\b/i.test(item.src)) return false
    const key = `${item.type}:${item.src}:${item.projectId || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const projects = computed<ScreenProject[]>(() => portfolio.projects.map(project => ({
  id: project.id,
  title: project.title,
  subtitle: project.subtitle,
  solution: project.solution,
})))

const channelButtons: Array<{ id: TelebotChannel; label: string }> = [
  { id: 'face', label: 'Face' },
  { id: 'term', label: 'Terminal' },
  { id: 'beats', label: 'Beats' },
  { id: 'scope', label: 'Scope' },
  { id: 'signal', label: 'Signal' },
  { id: 'reel', label: 'Reel' },
]

const screenTitle = computed(() => {
  const channel = state.channel
  if (channel === 'term' || channel === 'mood') return 'Terminal stream'
  if (channel === 'beats') return 'Attention beats'
  if (channel === 'scope' || channel === 'chapter') return state.chapterLabel || 'Chapter scope'
  if (channel === 'signal' || channel === 'noise') return 'Signal recovery'
  if (channel === 'reel' || channel === 'project') return media.value.length ? `Media ${state.mediaIndex + 1}` : 'Designed no-media screen'
  return state.mood === 'sleep' ? 'Sleeping softly' : 'MEG face'
})

const screenCaption = computed(() => {
  const project = state.projectId ? ` · project ${state.projectId}` : ''
  const chapter = state.chapterLabel ? ` · ${state.chapterLabel}` : ''
  return reelCaption.value || `${screenTitle.value}${chapter}${project}`
})

const hasMovingReel = computed(() => {
  if (!['idle', 'reel', 'project'].includes(state.channel)) return false
  const pool = state.projectId ? media.value.filter(item => item.projectId === state.projectId) : media.value
  const item = pool[state.mediaIndex]
  return item?.type === 'video'
})

function setReducedMotion(): void {
  reducedMotion.value = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function setPointer(event: PointerEvent): void {
  if (!controller || !canvasRef.value) return
  // Touch scrolling must remain native. Mouse and pen pointers can drive the
  // gaze without ever cancelling a browser gesture.
  if (event.pointerType === 'touch' || reducedMotion.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
    onPointerLeave()
    return
  }
  const gaze = controller.setPointer(event.clientX, event.clientY, rect)
  tb.setMouseNDC(gaze)
}

function onPointerLeave(): void {
  tb.setMouseNDC({ x: 0, y: 0 })
}

function nextScreen(): void {
  if (!controller) return
  if (reelPaused.value) resumeReel()
  controller.next()
  if (reducedMotion.value) controller.renderStatic(state, true)
  scheduleReelPause(true)
}

function onScreenKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
    event.preventDefault()
    nextScreen()
  }
}

function chooseChannel(channel: TelebotChannel): void {
  if (reelPaused.value) resumeReel()
  tb.setChannel(channel)
  if (channel === 'reel') tb.playMedia(state.mediaIndex)
  if (controller) controller.renderStatic(state, reducedMotion.value)
  scheduleReelPause(true)
}

function syncSize(): void {
  if (!controller || !stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  if (width === allocatedSize.width && height === allocatedSize.height) return
  allocatedSize = { width, height }
  controller.resize(width, height)
}

function stopLoop(): void {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame)
  animationFrame = null
  controller?.setActive(false, !reducedMotion.value)
}

function shouldRender(): boolean {
  return visible.value && !document.hidden && !tb.isPaused() && !reelPaused.value && !destroyed
}

function startLoop(): void {
  if (animationFrame !== null || !controller || !shouldRender() || reducedMotion.value || props.idleMotion === false) return
  controller.setActive(true, !reducedMotion.value)
  const tick = (time: number) => {
    animationFrame = null
    if (!controller || !shouldRender()) {
      controller?.setActive(false, !reducedMotion.value)
      return
    }
    if (lastFrame) {
      const delta = time - lastFrame
      slowFrameBudget = slowFrameBudget * .94 + delta * .06
       if (slowFrameBudget > 1000 / 45) lowFpsFrames++
      else lowFpsFrames = Math.max(0, lowFpsFrames - 2)
      if (lowFpsFrames > 90 && currentQuality.value === 'high') {
        currentQuality.value = 'low'
        controller.setQuality('low')
        lowFpsFrames = 0
      }
    }
    lastFrame = time
    if (props.idleMotion !== false || reducedMotion.value) controller.render(time, state, reducedMotion.value)
    animationFrame = requestAnimationFrame(tick)
  }
  animationFrame = requestAnimationFrame(tick)
}

function onDocumentVisibility(): void {
  if (document.hidden) stopLoop()
  else startLoop()
}

function onReducedMotionChange(): void {
  setReducedMotion()
  controller?.renderStatic(state, reducedMotion.value)
  if (reducedMotion.value) {
    clearReelPauseTimer()
    reelPaused.value = true
    reelPauseReason = 'reduced-motion'
    stopLoop()
  } else {
    if (reelPauseReason === 'reduced-motion') {
      reelPaused.value = false
      reelPauseReason = null
    }
    startLoop()
    scheduleReelPause(true)
  }
}

function clearReelPauseTimer(): void {
  if (reelPauseTimer !== null) clearTimeout(reelPauseTimer)
  reelPauseTimer = null
  reelPauseKey = ''
}

function isReelChannel(): boolean {
  return ['idle', 'reel', 'project'].includes(state.channel)
}

function scheduleReelPause(force = false): void {
  if (reducedMotion.value || reelPauseReason === 'user' || !isReelChannel() || !hasMovingReel.value) return
  const key = `${state.channel}:${state.mediaIndex}:${state.projectId || ''}`
  if (!force && reelPauseTimer !== null && key === reelPauseKey) return
  clearReelPauseTimer()
  reelPauseKey = key
  reelPauseTimer = setTimeout(() => {
    reelPauseTimer = null
    if (!destroyed && !reducedMotion.value && isReelChannel() && hasMovingReel.value && !reelPaused.value) {
      reelPaused.value = true
      reelPauseReason = 'auto'
      stopLoop()
      controller?.renderStatic(state, reducedMotion.value)
    }
  }, 5000)
}

function resumeReel(): void {
  if (reducedMotion.value) return
  reelPaused.value = false
  reelPauseReason = null
  controller?.setActive(visible.value && !document.hidden, true)
  if (!document.hidden) controller?.renderStatic(state, false)
  startLoop()
  scheduleReelPause(true)
}

function toggleReelPause(): void {
  if (reelPaused.value) {
    resumeReel()
    return
  }
  clearReelPauseTimer()
  reelPaused.value = true
  reelPauseReason = 'user'
  stopLoop()
  controller?.renderStatic(state, reducedMotion.value)
}

async function mountScene(): Promise<void> {
  if (!canvasRef.value || destroyed) return
  setReducedMotion()
  try {
    // Deliberately dynamic: Three.js, RoomEnvironment and ScreenReel are not in the initial bundle.
    const { createTelebotScene } = await import('~/three/TelebotScene')
    if (destroyed || !canvasRef.value) return
    controller = createTelebotScene({
      canvas: canvasRef.value,
      media: media.value,
      projects: projects.value,
      name: props.name || bio.name,
      role: props.role || bio.role,
      quality: currentQuality.value,
      onMediaChange: (item, index) => {
        tb.playMedia(index)
        if (state.projectId) tb.setChannel('project')
        emit('media-change', item, index)
        scheduleReelPause(true)
      },
      onCaption: (caption) => { reelCaption.value = caption },
      onInvalidate: () => {
        if (controller && !document.hidden && (reducedMotion.value || animationFrame === null)) controller.renderStatic(state, reducedMotion.value)
      },
    })
    controller.setActive(visible.value && !document.hidden && !reelPaused.value, !reducedMotion.value && props.idleMotion !== false)
    syncSize()
    loading.value = false
    emit('ready')
    controller.renderStatic(state, reducedMotion.value)
    startLoop()
    scheduleReelPause(true)
  } catch (error) {
    fallback.value = true
    loading.value = false
    errorMessage.value = error instanceof Error ? error.message : 'WebGL is unavailable'
  }
}

watch(media, (next) => {
  if (controller) {
    controller.reel.setMedia(next)
    if (!document.hidden) controller.renderStatic(state, reducedMotion.value)
    scheduleReelPause(true)
  }
}, { deep: true })

watch(() => appSettings?.settings?.quality, (next) => {
  if (next !== 'low' && next !== 'high') return
  currentQuality.value = next
  controller?.setQuality(next)
})

watch(() => [state.channel, state.termText, state.mediaIndex, state.projectId, state.chapterLabel, state.danceToken, state.mouseNDC.x, state.mouseNDC.y], () => {
  // State remains useful in reduced-motion mode and while animation is paused.
  if (controller && !document.hidden && (reducedMotion.value || animationFrame === null)) controller.renderStatic(state, reducedMotion.value)
  if (!isReelChannel()) {
    clearReelPauseTimer()
    if (reelPauseReason === 'auto') {
      reelPaused.value = false
      reelPauseReason = null
    }
  } else scheduleReelPause()
  if (shouldRender()) startLoop()
})

onMounted(() => {
  if (!containerRef.value) return
  resizeObserver = new ResizeObserver(syncSize)
  if (stageRef.value) resizeObserver.observe(stageRef.value)
  intersectionObserver = new IntersectionObserver((entries) => {
    visible.value = entries.some(entry => entry.isIntersecting)
    if (visible.value) startLoop()
    else stopLoop()
  }, { threshold: .01 })
  intersectionObserver.observe(containerRef.value)
  document.addEventListener('visibilitychange', onDocumentVisibility, { passive: true })
  window.addEventListener('pointermove', setPointer, { passive: true })
  qualityObserver = window.matchMedia('(prefers-reduced-motion: reduce)')
  qualityObserver.addEventListener?.('change', onReducedMotionChange)
  void mountScene()
})

onBeforeUnmount(() => {
  destroyed = true
  stopLoop()
  clearReelPauseTimer()
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  document.removeEventListener('visibilitychange', onDocumentVisibility)
  window.removeEventListener('pointermove', setPointer)
  qualityObserver?.removeEventListener?.('change', onReducedMotionChange)
  controller?.dispose()
  controller = null
  allocatedSize = { width: 0, height: 0 }
})

defineExpose({
  loading,
  drawCalls,
  triCount,
  next: nextScreen,
  playMedia: (index: number) => tb.playMedia(index),
  setProjectPreview: (id: string | null) => tb.setProjectPreview(id),
  dance: () => tb.dance(),
})
</script>

<template>
  <div
    ref="containerRef"
    class="tb3d"
    :style="{ maxWidth: maxWidth || undefined, '--tb-width': `${width}px`, '--tb-height': `${height}px` }"
    :data-quality="currentQuality"
  >
    <div ref="stageRef" class="tb3d__stage">
      <canvas
        ref="canvasRef"
        class="tb3d__canvas"
        :width="width"
        :height="height"
        tabindex="0"
        role="img"
        :aria-label="`Interactive CRT MEG. Current screen: ${screenCaption}. Press Enter or Space to advance.`"
        @pointerleave="onPointerLeave"
        @click="nextScreen"
        @keydown="onScreenKeydown"
      />
      <button
        v-if="hasMovingReel"
        type="button"
        class="tb3d__pause mono"
        :aria-label="reelPaused ? 'Resume MEG reel' : 'Pause MEG reel'"
        @click.stop="toggleReelPause"
      >{{ reelPaused ? 'PLAY' : 'PAUSE' }}</button>
      <div v-if="loading" class="tb3d__loading mono" aria-live="polite">WAKING CRT…</div>
      <div v-if="fallback" class="tb3d__fallback" role="img" :aria-label="`MEG fallback: ${screenCaption}`">
        <svg viewBox="0 0 460 560" aria-hidden="true" focusable="false">
          <defs><linearGradient id="telebotFallbackGlow" x1="0" x2="1"><stop stop-color="#ced0c7"/><stop offset="1" stop-color="#a9a6a1"/></linearGradient></defs>
          <path d="M94 516c10-103 49-149 136-149s126 46 136 149" fill="#aaa9a7" stroke="#44464a" stroke-width="8"/>
          <path d="M123 392h214" stroke="#4d4f53" stroke-width="13"/>
          <rect x="89" y="82" width="282" height="224" rx="32" fill="url(#telebotFallbackGlow)" stroke="#42454a" stroke-width="8"/>
          <rect x="119" y="111" width="222" height="157" rx="21" fill="#0b1220" stroke="#252a31" stroke-width="12"/>
          <path d="M164 190h45m42 0h45m-65 21h12m-48 25h95" stroke="#86e3dc" stroke-width="10" stroke-linecap="square"/>
          <circle cx="374" cy="174" r="40" fill="none" stroke="#4b9cff" stroke-width="8"/>
          <path d="M122 308h216" stroke="#202329" stroke-width="7"/>
          <path d="M146 347v105m168-105v105M230 347v125" stroke="#131519" stroke-width="12" stroke-linecap="round"/>
          <path d="M230 307v42" stroke="#202329" stroke-width="15"/>
        </svg>
        <span class="mono">WebGL unavailable · accessible CRT fallback</span>
      </div>
    </div>
    <p class="tb3d__caption" :title="screenCaption">
      <span class="mono">SCREEN</span>
      <span class="tb3d__caption-visible">{{ screenCaption }}</span>
      <span v-if="errorMessage" class="mono">· {{ errorMessage }}</span>
      <span class="sr-only" aria-live="polite">{{ screenCaption }}</span>
    </p>
    <div class="tb3d__channels" role="group" aria-label="MEG screen channels">
      <button
        v-for="button in channelButtons"
        :key="button.id"
        type="button"
        class="tb3d__channel mono"
        :class="{ 'is-active': state.channel === button.id || (button.id === 'face' && ['idle', 'smile', 'happy'].includes(state.channel)) }"
        :aria-pressed="state.channel === button.id"
        @click="chooseChannel(button.id)"
      >{{ button.label }}</button>
    </div>
  </div>
</template>

<style scoped>
.tb3d { position: relative; display: grid; grid-template-rows: minmax(0, 1fr) 1.35rem 1.8rem; width: min(100%, var(--tb-width)); height: var(--tb-height); min-width: 0; min-height: 0; max-width: 520px; overflow: hidden; color: var(--ink, #17191d); contain: layout paint; }
.tb3d__stage { position: relative; width: 100%; min-width: 0; min-height: 0; height: auto; overflow: hidden; isolation: isolate; contain: size layout paint; border-radius: 18px; background: radial-gradient(circle at 50% 22%, color-mix(in oklab, #ffffff 72%, var(--bg, #f5f1e9)) 0%, color-mix(in oklab, #d9dde0 84%, var(--bg, #f5f1e9)) 58%, color-mix(in oklab, #c3c8cc 72%, var(--bg, #f5f1e9)) 100%); box-shadow: inset 0 -22px 36px rgba(42, 47, 53, .08), inset 0 0 0 1px rgba(42, 47, 53, .12); }
.tb3d__canvas { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; max-width: none; max-height: none; outline: none; touch-action: pan-y; cursor: crosshair; }
.tb3d__canvas:focus-visible { outline: 2px solid color-mix(in oklab, var(--accent, #3155c8) 70%, transparent); outline-offset: 5px; border-radius: 18px; }
.tb3d__loading, .tb3d__fallback { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; gap: .7rem; color: var(--muted, #686b72); pointer-events: none; }
.tb3d__loading { background: color-mix(in oklab, var(--bg, #f5f1e9) 72%, transparent); font-size: 12px; letter-spacing: .13em; }
.tb3d__fallback { padding: 5%; background: color-mix(in oklab, var(--surface, #ebe8e0) 85%, transparent); border-radius: 26px; text-align: center; }
.tb3d__fallback svg { display: block; width: 100%; max-height: 540px; }
.tb3d__fallback span { font-size: 11px; }
.tb3d__pause { position: absolute; z-index: 2; top: .45rem; right: .45rem; appearance: none; border: 1px solid rgba(23, 25, 29, .24); border-radius: 999px; padding: .22rem .4rem; background: rgba(245, 241, 233, .78); color: var(--ink, #17191d); cursor: pointer; font-size: 8px; letter-spacing: .08em; backdrop-filter: blur(5px); }
.tb3d__pause:hover, .tb3d__pause:focus-visible { background: var(--bg, #f5f1e9); border-color: var(--accent, #3155c8); }
.tb3d__caption { display: flex; align-items: baseline; gap: .45rem; min-width: 0; min-height: 0; height: 1.35rem; overflow: hidden; margin: 0 .3rem; color: var(--muted, #6d7075); font-size: 11px; line-height: 1.35rem; white-space: nowrap; }
.tb3d__caption .mono:first-child { color: var(--accent, #3155c8); font-size: 10px; letter-spacing: .11em; }
.tb3d__caption-visible { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb3d__channels { display: flex; flex-wrap: nowrap; align-items: center; gap: .35rem; min-width: 0; height: 1.8rem; overflow-x: auto; overflow-y: hidden; padding: 0 .25rem; scrollbar-width: thin; }
.tb3d__channel { appearance: none; border: 1px solid color-mix(in oklab, var(--ink, #17191d) 15%, transparent); border-radius: 999px; padding: .35rem .6rem; background: transparent; color: var(--muted, #6d7075); cursor: pointer; font-size: 10px; letter-spacing: .04em; transition: color .2s ease, border-color .2s ease, background .2s ease, transform .2s ease; }
.tb3d__channel { flex: 0 0 auto; white-space: nowrap; }
.tb3d__channel:hover, .tb3d__channel:focus-visible { color: var(--ink, #17191d); border-color: color-mix(in oklab, var(--accent, #3155c8) 55%, transparent); transform: translateY(-1px); }
.tb3d__channel.is-active { color: var(--bg, #f5f1e9); background: var(--ink, #17191d); border-color: var(--ink, #17191d); }
@media (max-width: 720px) {
  .tb3d { max-width: 340px; }
  .tb3d__pause { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tb3d__channel { transition: none; }
}
</style>
