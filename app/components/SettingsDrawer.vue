<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  soundOn: boolean
  darkMode: boolean
  quality: 'low' | 'high'
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update:soundOn', value: boolean): void
  (event: 'update:darkMode', value: boolean): void
  (event: 'update:quality', value: 'low' | 'high'): void
}>()

const panel = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
let previousOverflow = ''

function focusable() {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])
}

function onKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab') return
  const items = focusable()
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

function closeOnBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close')
}

watch(() => props.isOpen, async (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    await nextTick()
    focusable()[0]?.focus()
  } else {
    document.body.style.overflow = previousOverflow
    await nextTick()
    previousFocus?.focus()
    previousFocus = null
  }
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button type="button" class="settings__veil" aria-label="Close settings" @click="emit('close')"></button>
      <aside ref="panel" class="settings__panel">
        <header class="settings__header">
          <div>
            <p class="mono settings__kicker">Studio controls</p>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button type="button" class="settings__close" aria-label="Close settings" @click="emit('close')">×</button>
        </header>

        <div class="settings__body">
          <div class="settings__row">
            <div><strong>Sound</strong><p>Optional interface cues. Quiet by default.</p></div>
            <button class="settings__switch" :class="{ 'is-on': soundOn }" type="button" role="switch" :aria-checked="soundOn" @click="emit('update:soundOn', !soundOn)"><span aria-hidden="true"></span></button>
          </div>
          <div class="settings__row">
            <div><strong>Dark canvas</strong><p>Use a low-light ink studio.</p></div>
            <button class="settings__switch" :class="{ 'is-on': darkMode }" type="button" role="switch" :aria-checked="darkMode" @click="emit('update:darkMode', !darkMode)"><span aria-hidden="true"></span></button>
          </div>
          <div class="settings__row">
            <div><strong>Motion detail</strong><p>Low is useful for slower devices.</p></div>
            <div class="settings__seg" role="group" aria-label="Motion detail">
              <button type="button" :class="{ 'is-active': quality === 'low' }" :aria-pressed="quality === 'low'" @click="emit('update:quality', 'low')">Low</button>
              <button type="button" :class="{ 'is-active': quality === 'high' }" :aria-pressed="quality === 'high'" @click="emit('update:quality', 'high')">High</button>
            </div>
          </div>
        </div>
        <p class="settings__note mono">Sound is off until you choose otherwise. Motion follows your system preference.</p>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.settings { position: fixed; inset: 0; z-index: var(--z-drawer); display: grid; justify-items: end; }
.settings__veil { position: absolute; inset: 0; background: color-mix(in oklab, var(--ink) 38%, transparent); }
.settings__panel { position: relative; width: min(440px, 100vw); min-height: 100%; padding: 28px clamp(20px, 4vw, 48px); display: flex; flex-direction: column; background: var(--bg); border-left: 1px solid var(--line); box-shadow: -24px 0 80px -48px var(--ink); animation: settings-in .28s var(--ease-out3) both; }
.settings__header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 1px solid var(--line); }
.settings__kicker { margin-bottom: 10px; color: var(--accent); }
.settings h2 { font-size: clamp(32px, 5vw, 56px); letter-spacing: -.04em; }
.settings__close { width: 36px; height: 36px; border: 1px solid var(--line-strong); font-size: 26px; line-height: 1; }
.settings__close:hover { color: var(--accent); border-color: var(--accent); }
.settings__body { display: grid; gap: 0; }
.settings__row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 24px 0; border-bottom: 1px solid var(--line); }
.settings__row strong { display: block; font-size: 17px; }
.settings__row p { margin-top: 5px; max-width: 28ch; color: var(--muted); font-size: 13px; line-height: 1.45; }
.settings__switch { position: relative; flex: 0 0 auto; width: 46px; height: 26px; border: 1px solid var(--line-strong); border-radius: 999px; background: var(--bg-soft); }
.settings__switch span { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--muted); transition: transform .2s ease, background-color .2s ease; }
.settings__switch.is-on { background: var(--accent); border-color: var(--accent); }
.settings__switch.is-on span { transform: translateX(20px); background: var(--bg); }
.settings__seg { display: inline-flex; padding: 3px; border: 1px solid var(--line-strong); }
.settings__seg button { padding: 7px 11px; color: var(--muted); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; }
.settings__seg button.is-active { color: var(--ink); background: var(--bg-soft); }
.settings__note { margin-top: auto; padding-top: 24px; color: var(--muted); line-height: 1.5; }
@keyframes settings-in { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .settings__panel { animation: none; } }
</style>
