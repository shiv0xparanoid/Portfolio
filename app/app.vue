<script setup lang="ts">
/**
 * app.vue — Root of the site.
 * Responsibilities:
 *   1. Render <a class="skip-link"> → #main-content (a11y).
 *   2. Apply theme + quality from localStorage on boot → data-theme + data-quality.
 *   3. Provide reactive appSettings state (sound/theme/quality) + persistence.
 *   4. Render Navigation, Settings drawer, NuxtPage, AskTelebot mini, CustomCursor, grain overlay.
 *   5. Provide a reactive "current chapter" for Telebot mood sync + nav active state.
 */

import { computed, watchEffect, onMounted } from 'vue'

// --- App settings with localStorage persistence ----------------------------------
const DEFAULTS = { sound: false as boolean, theme: 'light' as 'light' | 'dark', quality: 'high' as 'low' | 'high' }
const STORAGE_KEY = 'ss-portfolio-settings-v1'

function readInitial() {
  if (typeof window === 'undefined') return { ...DEFAULTS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULTS.sound,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      quality: parsed.quality === 'low' ? 'low' : 'high'
    }
  } catch {
    return { ...DEFAULTS }
  }
}

const settings = reactive(readInitial())

watchEffect(() => {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', settings.theme)
  document.documentElement.setAttribute('data-quality', settings.quality)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sound: settings.sound, theme: settings.theme, quality: settings.quality
    }))
  } catch {
    /* localStorage unavailable — ok to ignore */
  }
})

const soundOn = computed({
  get: () => settings.sound,
  set: (v: boolean) => (settings.sound = v)
})

const darkMode = computed({
  get: () => settings.theme === 'dark',
  set: (v: boolean) => (settings.theme = v ? 'dark' : 'light')
})

const quality = computed({
  get: () => settings.quality,
  set: (v: 'low' | 'high') => (settings.quality = v)
})

// --- Provide to children --------------------------------------------------------
provide('appSettings', {
  settings: readonly(settings),
  soundOn,
  darkMode,
  quality,
  openSettingsDrawer: () => { /* drawer emits handled directly below */ }
})

const settingsOpen = ref(false)
function toggleSettings() { settingsOpen.value = !settingsOpen.value }
function closeSettings() { settingsOpen.value = false }

// --- Global reduced-motion handling: if true, force quality=low ----------------
onMounted(() => {
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      // Keep user quality preference, but the CSS data-quality overrides already exist.
      // We intentionally DON'T override user quality here — reduced motion uses its own media query.
    }
  } catch { /* noop */ }
})
</script>

<template>
  <!-- a11y: first focusable always visible via keyboard -->
  <a class="skip-link" href="#main-content">Skip to content</a>

  <!-- subtle grain overlay (hidden on quality=low, always pointer-events-none) -->
  <div class="grain" aria-hidden="true"></div>

  <!-- Fixed chrome -->
  <Navigation
    :sound-on="soundOn"
    :dark-mode="darkMode"
    :quality="quality"
    @toggle-settings="toggleSettings"
  />

  <SettingsDrawer
    :is-open="settingsOpen"
    v-model:sound-on="soundOn"
    v-model:dark-mode="darkMode"
    v-model:quality="quality"
    @close="closeSettings"
  />

  <CustomCursor v-if="quality !== 'low'" />

  <!-- Main page content -->
  <main id="main-content" role="main">
    <NuxtPage />
  </main>

  <!-- One persistent CRT canvas; it follows the hero/ask anchors. -->
  <ClientOnly>
    <PersistentTelebot :show-corner="false" />
  </ClientOnly>

  <!-- Persistent mini chat pill (expands in place) -->
  <AskTelebotMini />
</template>

<style>
/* Make sure Nuxt root takes full viewport */
html, body, #__nuxt, #__nuxt > div {
  min-height: 100%;
  margin: 0;
}
</style>
