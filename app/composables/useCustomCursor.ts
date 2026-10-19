import { ref, onMounted, onBeforeUnmount } from 'vue'

export interface CustomCursorOptions {
  cursorClass?: string
  hoverClass?: string
  magneticSelector?: string
  ctaSelector?: string
  magneticStrength?: number
  lerp?: number
}

export function useCustomCursor(options: CustomCursorOptions = {}) {
  const {
    cursorClass = 'custom-cursor',
    hoverClass = 'is-hovering',
    magneticSelector = 'a, button, [data-cursor-hover]',
    ctaSelector = '[data-cursor-cta]',
    magneticStrength = 0.3,
    lerp = 0.15,
  } = options

  const mouseX = ref(0)
  const mouseY = ref(0)
  const cursorX = ref(0)
  const cursorY = ref(0)
  const isHovering = ref(false)
  const isClicking = ref(false)
  const hoverTarget = ref<HTMLElement | null>(null)

  let cursorEl: HTMLElement | null = null
  let rafId: number | null = null

  const onMouseMove = (e: MouseEvent) => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY

    const target = e.target as HTMLElement
    const magneticEl = target.closest(magneticSelector) as HTMLElement | null
    const ctaEl = target.closest(ctaSelector) as HTMLElement | null

    if (magneticEl || ctaEl) {
      isHovering.value = true
      hoverTarget.value = magneticEl || ctaEl
    } else {
      isHovering.value = false
      hoverTarget.value = null
    }
  }

  const onMouseDown = () => {
    isClicking.value = true
  }

  const onMouseUp = () => {
    isClicking.value = false
  }

  const onMouseLeave = () => {
    isHovering.value = false
    hoverTarget.value = null
  }

  const animate = () => {
    let targetX = mouseX.value
    let targetY = mouseY.value

    if (hoverTarget.value && isHovering.value) {
      const rect = hoverTarget.value.getBoundingClientRect()
      const elCenterX = rect.left + rect.width / 2
      const elCenterY = rect.top + rect.height / 2
      targetX = mouseX.value + (elCenterX - mouseX.value) * magneticStrength
      targetY = mouseY.value + (elCenterY - mouseY.value) * magneticStrength
    }

    cursorX.value += (targetX - cursorX.value) * lerp
    cursorY.value += (targetY - cursorY.value) * lerp

    if (cursorEl) {
      cursorEl.style.transform = `translate3d(${cursorX.value}px, ${cursorY.value}px, 0)`
      cursorEl.classList.toggle(hoverClass, isHovering.value)
      cursorEl.classList.toggle('is-clicking', isClicking.value)
    }

    rafId = requestAnimationFrame(animate)
  }

  const createCursor = () => {
    if (typeof document === 'undefined') return
    cursorEl = document.createElement('div')
    cursorEl.className = cursorClass
    document.body.appendChild(cursorEl)
  }

  const init = () => {
    if (typeof window === 'undefined') return
    createCursor()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseLeave)
    animate()
  }

  const destroy = () => {
    if (typeof window === 'undefined') return
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('mouseleave', onMouseLeave)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (cursorEl && cursorEl.parentNode) {
      cursorEl.parentNode.removeChild(cursorEl)
      cursorEl = null
    }
  }

  onMounted(() => init())
  onBeforeUnmount(() => destroy())

  return {
    mouseX,
    mouseY,
    cursorX,
    cursorY,
    isHovering,
    isClicking,
    hoverTarget,
    init,
    destroy,
  }
}
