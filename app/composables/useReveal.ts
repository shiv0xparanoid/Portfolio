import { ref, unref, onMounted, onBeforeUnmount, getCurrentInstance, nextTick } from 'vue'
import type { Ref } from 'vue'

/**
 * useReveal — split-line mask reveal via IntersectionObserver + GSAP (or CSS fallback).
 * Split lines inside .reveal-line elements using white-space:pre + translateY clip mask.
 * Reduced-motion: mark visible with no translate animation (opacity fade only).
 */
export interface RevealOptions {
  threshold?: number | number[]
  rootMargin?: string
  staggerMs?: number
  selector?: string
  disableTranslate?: boolean
}

export function useReveal(target: Ref<HTMLElement | null> | HTMLElement, options: RevealOptions = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -10% 0px',
    staggerMs = 60,
    selector = '.reveal-line, .reveal-block',
    disableTranslate = false
  } = options

  const isVisible = ref(false)
  let observer: IntersectionObserver | null = null
  const reducedMotion = ref(false)

  const getTargets = (): HTMLElement[] => {
    const root = target instanceof HTMLElement ? target : unref(target)
    if (!root) return []
    const hits = root.querySelectorAll<HTMLElement>(selector)
    if (hits.length > 0) return Array.from(hits)
    return [root]
  }

  const applyInitialHidden = (el: HTMLElement) => {
    if (reducedMotion.value || disableTranslate) {
      el.style.opacity = '0'
      el.style.transform = 'none'
      el.style.transition = `opacity var(--dur-300) var(--ease-out3)`
    } else {
      el.classList.add('is-hidden-before-reveal')
    }
  }

  const revealOne = (el: HTMLElement, index: number) => {
    if (reducedMotion.value || disableTranslate) {
      el.style.transitionDelay = `${index * staggerMs}ms`
      requestAnimationFrame(() => { el.style.opacity = '1' })
      return
    }
    // Use CSS-based reveal via classname toggle; stagger via inline delay.
    el.style.transitionDelay = `${index * staggerMs}ms`
    el.classList.add('is-visible')
  }

  const init = () => {
    if (typeof window === 'undefined') return
    const elements = getTargets()
    if (elements.length === 0) return

    elements.forEach(applyInitialHidden)

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const entryIdx = elements.indexOf(entry.target as HTMLElement)
        revealOne(entry.target as HTMLElement, entryIdx >= 0 ? entryIdx : 0)
        if (entry.target === (target instanceof HTMLElement ? target : unref(target))) {
          isVisible.value = true
        }
        observer?.unobserve(entry.target)
      })
    }, { threshold, rootMargin })

    elements.forEach((el) => observer?.observe(el))
  }

  const destroy = () => {
    if (observer) { observer.disconnect(); observer = null }
  }

  // Register lifecycle hooks only if we're still in setup phase.
  // If useReveal() is called from inside another onMounted, the hooks
  // below won't fire — fall back to nextTick for init and skip cleanup
  // (the IntersectionObserver auto-disconnects when its root is removed).
  const instance = getCurrentInstance()
  if (instance) {
    onMounted(() => {
      try {
        reducedMotion.value = typeof window !== 'undefined' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch { /* noop */ }
      init()
    })
    onBeforeUnmount(() => destroy())
  } else {
    // Called after setup (e.g. inside onMounted) — run immediately.
    try {
      reducedMotion.value = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* noop */ }
    nextTick(() => init())
  }

  return { isVisible, init, destroy }
}
