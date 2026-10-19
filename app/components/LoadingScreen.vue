<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ durationMs?: number }>()
const emit = defineEmits<{
  (event: 'progress', value: number): void
  (event: 'complete'): void
}>()

const progress = ref(0)
const dismissed = ref(false)
let poll: number | undefined
let timeout: number | undefined
let finished = false

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function documentReadiness() {
  if (typeof document === 'undefined') return 0
  const documentPart = document.readyState === 'complete' ? 0.7 : document.readyState === 'interactive' ? 0.45 : 0.2
  const fontPart = 'fonts' in document && document.fonts.status === 'loaded' ? 0.3 : 0
  return Math.min(0.98, documentPart + fontPart)
}

function publish(value: number) {
  const next = Math.max(progress.value, Math.min(100, Math.round(value)))
  progress.value = next
  emit('progress', next)
}

function finish() {
  if (finished) return
  finished = true
  if (poll) window.clearInterval(poll)
  if (timeout) window.clearTimeout(timeout)
  publish(100)
  if (prefersReducedMotion()) {
    dismissed.value = true
    emit('complete')
    return
  }
  window.setTimeout(() => {
    dismissed.value = true
    emit('complete')
  }, 120)
}

onMounted(() => {
  if (prefersReducedMotion()) { finish(); return }

  const check = () => {
    const value = documentReadiness()
    publish(value * 100)
    if (value >= 0.98) finish()
  }
  check()
  poll = window.setInterval(check, 24)
  if ('fonts' in document) document.fonts.ready.then(check).catch(() => {})
  document.addEventListener('DOMContentLoaded', check, { once: true })
  // Readiness is useful, never a gate: release the overlay within one second.
  timeout = window.setTimeout(finish, 850)
})

onBeforeUnmount(() => {
  if (poll) window.clearInterval(poll)
  if (timeout) window.clearTimeout(timeout)
})
</script>

<template>
  <section class="loader" :class="{ 'is-dismissed': dismissed }" aria-live="polite" aria-label="Checking portfolio readiness">
    <div class="loader__inner">
      <div class="loader__top mono"><span>SS / PORTFOLIO</span><span>READY CHECK</span></div>
      <p class="loader__name">SHIVANG <span class="emotional">/</span> SAGAR</p>
      <p class="loader__tagline">Human ideas. Tangible technology.</p>
      <div class="loader__value mono"><span>{{ String(progress).padStart(3, '0') }}</span><small>%</small></div>
      <div class="loader__bar" aria-hidden="true"><span :style="{ width: `${progress}%` }"></span></div>
      <div class="loader__bottom mono"><span>DOCUMENT + FONTS</span><span>NO ASSET BLOCK</span></div>
    </div>
  </section>
</template>

<style scoped>
.loader { position: fixed; inset: 0; z-index: var(--z-loader); display: grid; place-items: center; background: var(--bg); color: var(--ink); transition: opacity .22s ease, visibility .22s ease; }
.loader.is-dismissed { opacity: 0; visibility: hidden; pointer-events: none; }
.loader__inner { width: min(680px, calc(100% - 32px)); }
.loader__top, .loader__bottom { display: flex; justify-content: space-between; gap: 20px; color: var(--muted); }
.loader__name { margin-top: clamp(48px, 10vh, 120px); font-size: clamp(48px, 9vw, 116px); line-height: .9; letter-spacing: -.06em; }
.loader__tagline { margin-top: 18px; font: italic 22px/1.2 var(--font-serif); }
.loader__value { margin-top: clamp(56px, 10vh, 120px); color: var(--accent); font-size: clamp(42px, 8vw, 88px); line-height: .9; }
.loader__value small { margin-left: 8px; color: var(--ink); font-size: .35em; }
.loader__bar { height: 2px; margin-top: 18px; overflow: hidden; background: var(--line); }
.loader__bar span { display: block; height: 100%; background: var(--accent); transition: width .08s linear; }
.loader__bottom { margin-top: 12px; font-size: 10px; }
@media (max-width: 520px) { .loader__top, .loader__bottom { font-size: 9px; } }
</style>
