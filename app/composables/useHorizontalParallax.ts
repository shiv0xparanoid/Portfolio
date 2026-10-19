import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export type HorizontalParallaxMode = 'pending' | 'horizontal' | 'native' | 'static'

export interface HorizontalParallaxOptions {
  stage: Ref<HTMLElement | null>
  viewport: Ref<HTMLElement | null>
  track: Ref<HTMLElement | null>
  progress?: Ref<HTMLElement | null>
  cardSelector?: string
  breakpoint?: number
}

/**
 * Scroll a wide card track through a pinned vertical section. The same
 * behavior is shared by the Capabilities and People/Recognition chapters:
 * desktop gets pinned GSAP motion, touch gets native overflow, and reduced
 * motion/low quality gets a static layout supplied by the component CSS.
 */
export function useHorizontalParallax(options: HorizontalParallaxOptions) {
  const mode = ref<HorizontalParallaxMode>('pending')
  let context: gsap.Context | undefined
  let resizeHandler: (() => void) | undefined

  function setProgress(value: number) {
    if (options.progress?.value) options.progress.value.style.transform = `scaleX(${value})`
  }

  onMounted(async () => {
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const stageElement = options.stage.value
    const viewportElement = options.viewport.value
    const trackElement = options.track.value

    if (!stageElement || !viewportElement || !trackElement) {
      mode.value = 'static'
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowQuality = document.documentElement.dataset.quality === 'low'
    const nativeOverflow = window.matchMedia(`(max-width: ${options.breakpoint ?? 800}px)`).matches

    if (reducedMotion || lowQuality) {
      mode.value = 'static'
      return
    }

    if (nativeOverflow) {
      mode.value = 'native'
      return
    }

    mode.value = 'horizontal'
    gsap.registerPlugin(ScrollTrigger)

    context = gsap.context(() => {
      const getTravel = () => Math.max(0, trackElement.scrollWidth - viewportElement.clientWidth)
      const getPinDistance = () => Math.max(window.innerHeight * 1.35, getTravel() + window.innerHeight * 0.35)
      const cards = gsap.utils.toArray<HTMLElement>(
        options.cardSelector || '[data-parallax-card]',
        trackElement,
      )

      gsap.to(trackElement, {
        x: () => -getTravel(),
        ease: 'none',
        scrollTrigger: {
          trigger: stageElement,
          start: 'top top',
          end: () => `+=${getPinDistance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (trigger) => setProgress(trigger.progress),
        },
      })

      cards.forEach((card, index) => {
        const direction = index % 2 === 0 ? 1 : -1
        gsap.fromTo(card,
          { y: direction * 26, rotation: direction * -0.7 },
          {
            y: direction * -26,
            rotation: direction * 0.7,
            ease: 'none',
            scrollTrigger: {
              trigger: stageElement,
              start: 'top top',
              end: () => `+=${getPinDistance()}`,
              scrub: 1,
              invalidateOnRefresh: true,
            },
          },
        )
      })
    }, stageElement)

    resizeHandler = () => ScrollTrigger.refresh()
    window.addEventListener('resize', resizeHandler, { passive: true })
    requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  })

  onBeforeUnmount(() => {
    if (resizeHandler) window.removeEventListener('resize', resizeHandler)
    context?.revert()
    context = undefined
  })

  return { mode }
}
