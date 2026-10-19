<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{
  soundOn: boolean
  darkMode: boolean
  quality: 'low' | 'high'
}>()

const emit = defineEmits<{
  (event: 'toggle-settings'): void
}>()

const activeId = ref('ch1')
const scrolled = ref(false)
const { $lenis } = useNuxtApp()
const links = [
  { id: 'ch7', label: 'Work', href: '#ch7' },
  { id: 'ch2', label: 'Story', href: '#ch2' },
  { id: 'ch9', label: 'Ask', href: '#ch9' }
]

function navigate(href: string, event?: MouseEvent) {
  event?.preventDefault()
  if (typeof document === 'undefined') return
  const target = document.querySelector<HTMLElement>(href)
  if (!target) return
  if ($lenis) $lenis.scrollTo(target, { offset: -72, duration: 0.8 })
  else target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  const ids = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10']
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) activeId.value = entry.target.id
    })
  }, { rootMargin: '-38% 0px -52% 0px' })
  ids.forEach((id) => {
    const section = document.getElementById(id)
    if (section) observer?.observe(section)
  })
  const onScroll = () => { scrolled.value = window.scrollY > 12 }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  cleanup = () => {
    observer?.disconnect()
    window.removeEventListener('scroll', onScroll)
  }
})

let cleanup: (() => void) | null = null
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <header class="nav" :class="{ 'is-scrolled': scrolled }">
    <div class="nav__inner">
      <a class="nav__brand" href="#ch1" aria-label="Shivang Sagar, home" @click="navigate('#ch1', $event)">
        <span class="nav__name">SHIVANG <span class="emotional">/</span> SAGAR</span>
        <span class="nav__tag mono">Human ideas. Tangible technology.</span>
      </a>

      <nav class="nav__links" aria-label="Primary navigation">
        <a
          v-for="link in links"
          :key="link.id"
          class="nav__link"
          :href="link.href"
          :aria-current="activeId === link.id ? 'page' : undefined"
          @click="navigate(link.href, $event)"
        >
          {{ link.label }}
        </a>
        <a class="nav__talk link-underline" href="#ch10" @click="navigate('#ch10', $event)">Let's talk <span aria-hidden="true">↗</span></a>
        <button class="nav__settings" type="button" aria-label="Open settings" title="Open settings" @click="emit('toggle-settings')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.nav { position: fixed; inset: 0 0 auto; z-index: var(--z-nav); border-bottom: 1px solid transparent; transition: background-color .25s ease, border-color .25s ease, backdrop-filter .25s ease; }
.nav.is-scrolled { background: color-mix(in oklab, var(--bg) 88%, transparent); border-color: var(--line); backdrop-filter: blur(16px) saturate(1.1); }
.nav__inner { width: var(--max-w); margin: 0 auto; padding: 18px var(--pad-x); display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.nav__brand { display: inline-flex; align-items: baseline; gap: 14px; color: var(--ink); text-decoration: none; white-space: nowrap; }
.nav__name { font-size: 14px; font-weight: 600; letter-spacing: -.015em; }
.nav__tag { color: var(--muted); font-size: 10px; letter-spacing: .08em; }
.nav__links { display: flex; align-items: center; gap: clamp(10px, 2vw, 28px); }
.nav__link, .nav__talk { color: var(--ink); font-size: 13px; text-decoration: none; }
.nav__link { display: inline-flex; gap: 5px; align-items: baseline; }
.nav__link:hover, .nav__link[aria-current="page"], .nav__talk:hover { color: var(--accent); }
.nav__talk { font-size: 14px; }
.nav__settings { width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid var(--line-strong); color: var(--ink); }
.nav__settings:hover { color: var(--accent); border-color: var(--accent); }
.nav__settings svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.5; }

@media (max-width: 780px) {
  .nav__inner { padding-block: 14px; }
  .nav__tag { display: none; }
  .nav__links { gap: 14px; }
}
@media (max-width: 500px) {
  .nav__name { font-size: 12px; }
  .nav__link, .nav__talk { font-size: 12px; }
  .nav__settings { width: 30px; height: 30px; }
}
</style>
