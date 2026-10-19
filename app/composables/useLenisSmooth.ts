import { ref, onMounted, onBeforeUnmount } from 'vue'
import Lenis from '@studio-freight/lenis'

export interface LenisOptions {
  duration?: number
  easing?: (t: number) => number
  orientation?: 'vertical' | 'horizontal'
  gestureOrientation?: 'vertical' | 'horizontal' | 'both'
  smoothWheel?: boolean
  smoothTouch?: boolean
  touchMultiplier?: number
  wheelMultiplier?: number
  infinite?: boolean
  wrapper?: HTMLElement | Window
  content?: HTMLElement
}

const singleton = {
  lenis: null as Lenis | null,
  rafId: null as number | null,
  scrollProgress: ref(0),
  scrollY: ref(0),
  initCalled: false
}

export function useLenisSmooth(options: LenisOptions = {}) {
  const {
    duration = 1.2,
    easing = (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation = 'vertical',
    gestureOrientation = 'vertical',
    smoothWheel = true,
    smoothTouch = false,
    touchMultiplier = 2,
    wheelMultiplier = 1,
    infinite = false,
  } = options

  const isReady = ref(false)

  const raf = (time: number) => {
    singleton.lenis?.raf(time)
    singleton.rafId = requestAnimationFrame(raf)
  }

  const initLenis = () => {
    if (typeof window === 'undefined') return
    if (singleton.lenis) {
      isReady.value = true
      return
    }

    singleton.lenis = new Lenis({
      duration,
      easing,
      orientation,
      gestureOrientation,
      smoothWheel,
      smoothTouch,
      touchMultiplier,
      wheelMultiplier,
      infinite,
    })

    singleton.lenis.on('scroll', ({ scroll, progress }: { scroll: number; progress: number }) => {
      singleton.scrollY.value = scroll
      singleton.scrollProgress.value = progress
    })

    singleton.rafId = requestAnimationFrame(raf)
    singleton.initCalled = true
    isReady.value = true
  }

  type ScrollToOpts = {
    offset?: number
    immediate?: boolean
    lock?: boolean
    duration?: number
    easing?: (t: number) => number
    lerp?: number
    onComplete?: () => void
    force?: boolean
    programmatic?: boolean
  }
  const scrollTo = (target: number | string | HTMLElement, opts?: ScrollToOpts) => {
    singleton.lenis?.scrollTo(target, opts)
  }

  const start = () => {
    singleton.lenis?.start()
  }

  const stop = () => {
    singleton.lenis?.stop()
  }

  const destroy = () => {
    if (singleton.rafId !== null) {
      cancelAnimationFrame(singleton.rafId)
      singleton.rafId = null
    }
    if (singleton.lenis) {
      singleton.lenis.destroy()
      singleton.lenis = null
    }
    singleton.initCalled = false
    isReady.value = false
  }

  onMounted(() => initLenis())

  return {
    lenis: singleton.lenis,
    scrollProgress: singleton.scrollProgress,
    scrollY: singleton.scrollY,
    isReady,
    initLenis,
    destroy,
    scrollTo,
    start,
    stop,
  }
}
