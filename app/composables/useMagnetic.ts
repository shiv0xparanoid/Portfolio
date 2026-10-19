import { ref, unref, onMounted, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

/**
 * useMagnetic — pointer-attracted 2D lerp on a single element.
 * Respects prefers-reduced-motion (disabled) and data-quality="low" (strength halved).
 * Call destroy() on unmount.
 */
export interface MagneticOptions {
  strength?: number
  lerp?: number
  scale?: number
  /** If true, completely disable magnetic for reduced motion / low quality */
  strictA11y?: boolean
}

export function useMagnetic(
  target: Ref<HTMLElement | null> | HTMLElement,
  options: MagneticOptions = {}
) {
  const {
    strength = 0.4,
    lerp = 0.12,
    scale = 1,
    strictA11y = false
  } = options

  const isHovering = ref(false)
  let rafId: number | null = null
  let active = true
  let tx = 0, ty = 0, cx = 0, cy = 0

  const getEl = (): HTMLElement | null => target instanceof HTMLElement ? target : unref(target)

  const determineEffectiveStrength = (): number => {
    let s = strength
    if (typeof document !== 'undefined') {
      const q = document.documentElement.getAttribute('data-quality')
      if (q === 'low') s *= 0.5
    }
    try {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (strictA11y) s = 0
        else s *= 0.25
      }
    } catch { /* noop */ }
    return s
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!active) return
    const el = getEl(); if (!el) return
    const rect = el.getBoundingClientRect()
    const effStrength = determineEffectiveStrength()
    tx = (e.clientX - (rect.left + rect.width / 2)) * effStrength
    ty = (e.clientY - (rect.top + rect.height / 2)) * effStrength
  }
  const onEnter = () => { isHovering.value = true }
  const onLeave = () => { isHovering.value = false; tx = 0; ty = 0 }

  const animate = () => {
    const el = getEl()
    if (el && active) {
      cx += (tx - cx) * lerp
      cy += (ty - cy) * lerp
      const s = isHovering.value ? scale : 1
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${s})`
      el.style.willChange = 'transform'
    }
    rafId = requestAnimationFrame(animate)
  }

  const init = () => {
    if (typeof window === 'undefined') return
    const el = getEl(); if (!el) return
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    animate()
  }
  const destroy = () => {
    active = false
    if (typeof window !== 'undefined') {
      const el = getEl()
      if (el) {
        el.removeEventListener('mousemove', onMouseMove)
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
        el.style.transform = ''
      }
    }
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }

  onMounted(init)
  onBeforeUnmount(destroy)

  return { isHovering, init, destroy }
}
