// composables/useSplitReveal.ts
// Scroll-driven split-text effects. Add data-split="<variant>" to any heading / paragraph
// and call useSplitReveal() once in the page. Every chapter can use a different variant.
//
// <h2 data-split="maskRise">Selected work</h2>
// <p  data-split="fill">Long paragraph that lights up word by word while you scroll.</p>
// <h3 data-split="scramble" data-split-delay="0.2">Ask the machine</h3>
// <h2 data-split="dust" data-split-pin="3">Held on screen for 3 screens, like the hero</h2>
//
// data-split         variant (default: maskRise)
// data-split-delay   seconds before this element starts (default 0)
// data-split-mode    "scrub" = tied to scroll position, otherwise plays once when it enters
// data-split-pin     number of screens to pin the parent <section> (hero-style hold)

import { nextTick, onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export type SplitVariant = 'dust' | 'maskRise' | 'blurFocus' | 'scramble' | 'flip' | 'drop' | 'fill' | 'slide'

const GLYPHS = '!<>-_\\/[]{}=+*^?#0123456789'
const rand = gsap.utils.random
const CHAR_VARIANTS: SplitVariant[] = ['dust', 'scramble', 'flip', 'drop']

function injectCss() {
  if (document.getElementById('split-reveal-css')) return
  const s = document.createElement('style')
  s.id = 'split-reveal-css'
  s.textContent = `
.sr-word{display:inline-block;white-space:nowrap}
.sr-char{display:inline-block;will-change:transform,opacity,filter}
.sr-mask{display:inline-block;overflow:hidden;vertical-align:top;padding:.12em 0 .14em;margin:-.12em 0 -.14em}`
  document.head.appendChild(s)
}

// wraps every word (and optionally every character) of the text inside `el`,
// keeping inline tags like <em> intact
function split(el: HTMLElement, chars: boolean) {
  const words: HTMLElement[] = []
  const charEls: HTMLElement[] = []
  const accessibleText = (el.textContent || '').replace(/\s+/g, ' ').trim()

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  nodes.forEach((node) => {
    const frag = document.createDocumentFragment()
    ;(node.nodeValue || '').split(/(\s+)/).forEach((part) => {
      if (!part) return
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return }
      const w = document.createElement('span')
      w.className = 'sr-word'
      w.setAttribute('aria-hidden', 'true')
      if (chars) {
        ;[...part].forEach((ch) => {
          const c = document.createElement('span')
          c.className = 'sr-char'
          c.textContent = ch
          w.appendChild(c)
          charEls.push(c)
        })
      } else w.textContent = part
      frag.appendChild(w)
      words.push(w)
    })
    node.parentNode!.replaceChild(frag, node)
  })

  // The generated visual spans are hidden from assistive technology. Keep the
  // original semantic element readable with a real text node instead of
  // putting aria-label on native <p>/<span> elements, where axe correctly
  // reports aria-prohibited-attr.
  el.removeAttribute('aria-label')
  const screenReaderText = document.createElement('span')
  screenReaderText.className = 'sr-only'
  screenReaderText.textContent = accessibleText
  el.appendChild(screenReaderText)

  return { words, chars: charEls }
}

// keeps long texts from taking forever: total stagger is capped
const amount = (n: number, per: number, max: number) => Math.min(n * per, max)

function build(el: HTMLElement, variant: SplitVariant, tl: gsap.core.Timeline, at: number) {
  const { words, chars } = split(el, CHAR_VARIANTS.includes(variant))

  switch (variant) {
    // letters fly in from scattered dust (same feel as the hero)
    case 'dust':
      tl.from(chars, {
        opacity: 0, scale: 0.3, filter: 'blur(14px)',
        x: () => rand(-140, 140), y: () => rand(-100, 100), rotate: () => rand(-45, 45),
        duration: 0.9, ease: 'power3.out', stagger: { amount: amount(chars.length, 0.03, 1.2) },
      }, at)
      break

    // words rise out of an invisible mask: editorial, clean (good for big titles)
    case 'maskRise':
      words.forEach((w) => {
        const mask = document.createElement('span')
        mask.className = 'sr-mask'
        w.parentNode!.insertBefore(mask, w)
        mask.appendChild(w)
      })
      tl.from(words, {
        yPercent: 115, rotate: 3, duration: 1, ease: 'power4.out',
        stagger: { amount: amount(words.length, 0.08, 1) },
      }, at)
      break

    // words snap into focus from a heavy blur: cinematic
    case 'blurFocus':
      tl.from(words, {
        opacity: 0, filter: 'blur(24px)', scale: 1.35, y: 20, duration: 1.2, ease: 'power2.out',
        stagger: { amount: amount(words.length, 0.12, 1.2) },
      }, at)
      break

    // terminal-style: characters shuffle through glyphs, then lock in left to right
    case 'scramble': {
      gsap.set(chars, { opacity: 0 })
      const gap = Math.min(0.035, 1.4 / Math.max(chars.length, 1))
      chars.forEach((c, i) => {
        const final = c.textContent || ''
        const o = { p: 0 }
        tl.to(c, { opacity: 1, duration: 0.01 }, at + i * gap)
        tl.to(o, {
          p: 1, duration: 0.55, ease: 'none',
          onUpdate: () => { c.textContent = o.p < 1 && final.trim() ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : final },
          onComplete: () => { c.textContent = final },
        }, at + i * gap)
      })
      break
    }

    // letters flip up like a departures board
    case 'flip':
      el.style.perspective = '700px'
      tl.from(chars, {
        rotationX: -90, yPercent: 60, opacity: 0, transformOrigin: '50% 100% -20px',
        duration: 0.8, ease: 'back.out(1.6)', stagger: { amount: amount(chars.length, 0.03, 1) },
      }, at)
      break

    // letters fall from above and bounce, starting from the middle
    case 'drop':
      tl.from(chars, {
        yPercent: -130, opacity: 0, rotate: () => rand(-14, 14), duration: 1.1, ease: 'bounce.out',
        stagger: { amount: amount(chars.length, 0.035, 1), from: 'center' },
      }, at)
      break

    // reading highlight: dim words light up as you scroll (best with data-split-mode scrub)
    case 'fill':
      gsap.set(words, { visibility: 'hidden' })
      tl.set(words, { visibility: 'visible' }, at)
      tl.fromTo(words, { opacity: 0.14 }, { opacity: 1, duration: 1, ease: 'none', stagger: { each: 0.1 } }, at)
      break

    // words slide in from alternating sides
    case 'slide':
      tl.from(words, {
        x: (i: number) => (i % 2 ? 1 : -1) * 140, opacity: 0, duration: 1, ease: 'power3.out',
        stagger: { amount: amount(words.length, 0.06, 0.9) },
      }, at)
      break
  }
}

export function useSplitReveal(root?: Ref<HTMLElement | undefined | null>, selector = '[data-split]') {
  let ctx: gsap.Context | undefined

  onMounted(async () => {
    await nextTick()
    // Let Nuxt finish its hydration pass before replacing text nodes with
    // animation spans. Mutating the SSR tree in the same frame can trigger a
    // hydration warning even though the final visual state is correct.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return // leave text as-is
    gsap.registerPlugin(ScrollTrigger)
    injectCss()

    const scope = (root?.value ?? document.body) as HTMLElement
    ctx = gsap.context(() => {
      scope.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        if (el.dataset.srDone) return
        el.dataset.srDone = '1'

        const variant = (el.dataset.split || 'maskRise') as SplitVariant
        const delay = parseFloat(el.dataset.splitDelay || '0')
        const pin = parseFloat(el.dataset.splitPin || '0')
        const scrub = variant === 'fill' || el.dataset.splitMode === 'scrub'

        let trigger: ScrollTrigger.Vars
        if (pin > 0) {
          trigger = {
            trigger: el.closest('section') || el, start: 'top top', pin: true, scrub: 1, anticipatePin: 1,
            invalidateOnRefresh: true, end: () => `+=${Math.round(window.innerHeight * pin)}`,
          }
        } else if (scrub) {
          trigger = { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: true }
        } else {
          trigger = { trigger: el, start: 'top 85%', toggleActions: 'play none none reset' }
        }

        const tl = gsap.timeline({ scrollTrigger: trigger })
        build(el, variant, tl, delay)
      })
    }, scope)

    const ready = scope.querySelectorAll('[data-sr-done]').length
    if (import.meta.dev) {
      if (ready) console.info('[useSplitReveal]', ready, 'element(s) ready in', scope.id || scope.tagName)
      else console.warn('[useSplitReveal] no [data-split] elements found in', scope.id || scope.tagName)
    }

    // trigger positions must be measured after fonts, images and the hero pin have settled
    requestAnimationFrame(() => ScrollTrigger.refresh())
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })
  })

  onBeforeUnmount(() => ctx?.revert())
}
