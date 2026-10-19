<script setup lang="ts">
defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()
</script>

<template>
  <main class="error-page">
    <p class="mono">SIGNAL LOST · {{ error.statusCode || 500 }}</p>
    <h1>That page slipped<br><em class="emotional">off-air.</em></h1>
    <p>The route is not in the canonical portfolio record. MEG recommends the work index instead of guessing.</p>
    <NuxtLink class="btn btn-primary" to="/">Return to the signal ↗</NuxtLink>
  </main>
</template>

<style scoped>
.error-page { min-height: 100svh; display: grid; align-content: center; justify-items: start; gap: 24px; width: min(880px, calc(100% - 32px)); margin: auto; }.error-page > .mono { color: var(--warm); }.error-page h1 { font-size: clamp(64px, 13vw, 180px); line-height: .82; letter-spacing: -.08em; }.error-page h1 em { color: var(--accent); }.error-page p:not(.mono) { max-width: 48ch; color: var(--muted); font-size: 18px; line-height: 1.5; }
</style>
