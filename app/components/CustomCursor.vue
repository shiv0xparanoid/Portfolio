<script setup lang="ts">
/**
 * CustomCursor.vue — soft dot + label hover state.
 * Respects: reduced-motion → hide; touch → hide; quality low → hide.
 * Click: dot → accent blink.
 * Hover interactive elements: label shows element role hint + scale up dot.
 */
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'

const show = ref(false)
const dotX = ref(0); const dotY = ref(0)
const curX = ref(0); const curY = ref(0)
const hovering = ref(false)
const clicking = ref(false)
const label = ref<string>('')
const rafId = ref<number | null>(null)

function shouldDisplay() {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (coarse) return false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return false
  const q = document.documentElement.getAttribute('data-quality')
  if (q === 'low') return false
  return true
}

const onMouseMove = (e: MouseEvent) => { dotX.value = e.clientX; dotY.value = e.clientY; show.value = true;
  // Determine interactive hover.
  const t = e.target as HTMLElement
  const interactive = t.closest('a, button, [data-cursor-hover], [role="button"], input, textarea, select, [tabindex="0"]') as HTMLElement | null
  hovering.value = !!interactive
  if (interactive) {
    const custom = interactive.getAttribute('data-cursor-label')
    if (custom) { label.value = custom }
    else if (interactive.tagName === 'BUTTON') label.value = 'Click'
    else if (interactive.tagName === 'A') label.value = (interactive as HTMLAnchorElement).target === '_blank' ? 'Open' : 'Go'
    else label.value = 'Interact'
  } else {
    label.value = ''
  }
}
const onMouseDown = () => { clicking.value = true }
const onMouseUp = () => { clicking.value = false }
const onLeave = () => { show.value = false; hovering.value = false; clicking.value = false }

const tick = () => {
  const lerp = .18
  curX.value += (dotX.value - curX.value) * lerp
  curY.value += (dotY.value - curY.value) * lerp
  rafId.value = requestAnimationFrame(tick)
}

const dotStyle = computed(() => {
  const scale = clicking.value ? 0.8 : hovering.value ? 1.55 : 1
  return {
    transform: `translate3d(${curX.value}px, ${curY.value}px, 0) translate(-50%,-50%) scale(${scale})`,
    backgroundColor: clicking.value ? 'var(--accent)' : hovering.value ? 'transparent' : 'var(--ink)',
    borderColor: hovering.value ? 'var(--accent)' : 'transparent',
    width: hovering.value ? '42px' : '8px',
    height: hovering.value ? '42px' : '8px',
  }
})

const labelStyle = computed(() => ({
  transform: `translate3d(${curX.value}px, ${curY.value}px, 0) translate(-50%, calc(-100% - 18px))`,
  opacity: hovering.value && label.value ? 1 : 0,
}))

watch(show, () => { /* noop */ })

onMounted(() => {
  if (!shouldDisplay()) return
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('mousedown', onMouseDown, { passive: true })
  window.addEventListener('mouseup', onMouseUp, { passive: true })
  document.addEventListener('mouseleave', onLeave)
  rafId.value = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mousedown', onMouseDown)
  window.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mouseleave', onLeave)
  if (rafId.value !== null) cancelAnimationFrame(rafId.value)
})
</script>

<template>
  <div v-if="show || hovering || clicking" class="cur" aria-hidden="true">
    <div class="cur__dot" :style="dotStyle"></div>
    <div v-if="label" class="cur__label" :style="labelStyle">{{ label }}</div>
  </div>
</template>

<style scoped>
.cur { position: fixed; inset: 0; pointer-events: none; z-index: 9998; }
.cur__dot {
  position: absolute; top: 0; left: 0;
  border-radius: 999px;
  border: 1.5px solid transparent;
  transition: background-color 120ms ease-out, border-color 120ms ease-out, width 160ms var(--ease-out3), height 160ms var(--ease-out3);
  will-change: transform, width, height, background-color;
  mix-blend-mode: difference;
}
.cur__label {
  position: absolute; top: 0; left: 0;
  padding: .25rem .6rem;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .08em; text-transform: uppercase;
  background: var(--accent); color: var(--bg);
  border-radius: 999px; white-space: nowrap;
  transition: opacity var(--dur-150);
}
</style>
