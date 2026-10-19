// plugins/01.gsap.client.ts — register GSAP + ScrollTrigger once,
// expose via NuxtApp $gsap / $ScrollTrigger + auto sync with Lenis smooth scroll.
// Also installs ScrollTrigger.refresh() when Lenis scrolls.

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from '@studio-freight/lenis'

gsap.registerPlugin(ScrollTrigger)

// Reduced motion → disable ScrollTrigger scrub animations globally.
try {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // ScrollTrigger still runs but snaps instead of scrubbing — make all tweens duration 0
    gsap.defaults({ duration: 0.001 })
  }
} catch { /* noop */ }

// Lenis singleton for the whole site (composables use the same instance).
let lenis: Lenis | null = null
let rafId: number | null = null

function getLenisInstance(): Lenis | null { return lenis }

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') {
    return { provide: { gsap, ScrollTrigger, lenis: null as Lenis | null } }
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!reduced) {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      smoothTouch: false,
      touchMultiplier: 2,
      wheelMultiplier: 1
    })

    lenis.on('scroll', () => {
      // Important: let ScrollTrigger know scroll position changed.
      ScrollTrigger.update()
    })

    const raf = (time: number) => {
      lenis?.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Ensure ScrollTrigger uses the document scroller for coords (Lenis works on body transform-less setups).
    ScrollTrigger.defaults({ scroller: window })
    window.addEventListener('resize', () => ScrollTrigger.refresh(), { passive: true })
  }

  return {
    provide: {
      gsap,
      ScrollTrigger,
      lenis,
      getLenisInstance
    }
  }
})

// Cleanup helper — not auto-called for plugin singletons but exposed if needed.
export function _destroyLenisForTests() {
  if (rafId !== null) cancelAnimationFrame(rafId)
  rafId = null
  if (lenis) { lenis.destroy(); lenis = null }
}

declare module '#app' {
  interface NuxtApp {
    $gsap: typeof gsap
    $ScrollTrigger: typeof ScrollTrigger
    $lenis: Lenis | null
    $getLenisInstance: () => Lenis | null
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $gsap: typeof gsap
    $ScrollTrigger: typeof ScrollTrigger
    $lenis: Lenis | null
  }
}
