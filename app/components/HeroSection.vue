<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useBio } from '~/composables/usePortfolioContent'
import { heroState } from '~/composables/useHeroState'
// explicit import: if the file is in the wrong place you get a clear build error instead of an empty screen
import ParticlePortrait from '~/components/ParticlePortrait.client.vue'

// kept so existing usages (<HeroSection :auto-start="...">) don't break
defineProps<{ autoStart?: boolean }>()
const emit = defineEmits<{ (event: 'ready'): void }>()

const bio = useBio()
const { $lenis } = useNuxtApp()
const root = ref<HTMLElement>()
let ctx: gsap.Context | undefined
let pinTrigger: ScrollTrigger | undefined

const intro = computed(() => bio.one_sentence || bio.tagline || '')
const introWords = computed(() => intro.value.split(' ').filter(Boolean))

// "Human ideas." -> [['H','u','m','a','n'], ['i','d','e','a','s','.']]
const splitWords = (s: string) => s.split(' ').map((w) => w.split(''))
const line1 = splitWords('Human ideas.')
const line2 = splitWords('Tangible technology.')

function scrollTo(id: string, event?: MouseEvent) {
  event?.preventDefault()
  if (typeof document === 'undefined') return
  const target = document.getElementById(id)
  if (!target) return
  if ($lenis) $lenis.scrollTo(target, { offset: -72, duration: 0.8 })
  else target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// jump to the end of the pinned intro (keyboard / impatient users)
function skipIntro() {
  const y = pinTrigger?.end
  if (typeof y !== 'number') return scrollTo('ch2')
  if ($lenis) $lenis.scrollTo(y, { duration: 0.8 })
  else window.scrollTo({ top: y, behavior: 'smooth' })
}

onMounted(async () => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  gsap.registerPlugin(ScrollTrigger)
  const el = root.value!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  // reduced motion: no pin, no scrubbing, everything shown in its final state
  if (reduce) {
    heroState.assemble = 1
    heroState.rotate = 0
    el.classList.add('is-static')
    emit('ready')
    return
  }

  ctx = gsap.context(() => {
    const chars = gsap.utils.toArray<HTMLElement>('.char')
    const words = gsap.utils.toArray<HTMLElement>('.hero__title .word')
    const lateFades = ['.hero__actions', '.hero__next']

    heroState.assemble = 0
    heroState.rotate = 0

    // starting state: every letter is "dust"
    gsap.set(chars, {
      opacity: 0,
      scale: 0.3,
      filter: 'blur(14px)',
      x: () => gsap.utils.random(-140, 140),
      y: () => gsap.utils.random(-100, 100),
      rotate: () => gsap.utils.random(-45, 45),
    })
    gsap.set('.iw', { opacity: 0, y: 8, filter: 'blur(6px)' })
    gsap.set(lateFades, { opacity: 0, y: 16 })
    el.classList.add('is-ready')

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // The portrait is a reveal, not a turntable: release the pin once the
        // front-facing figure and the useful actions have arrived.
        end: () => `+=${Math.round(window.innerHeight * (window.innerWidth < 700 ? 2.6 : 3.4))}`,
      },
    })
    pinTrigger = tl.scrollTrigger as ScrollTrigger

    // 1. headline: one word after another, each letter flies in from the dust
    words.forEach((w, i) => {
      tl.to(
        w.querySelectorAll('.char'),
        { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'power3.out', stagger: 0.04 },
        0.6 + i * 0.9,
      )
    })

    // 2. the portrait gathers while the user scrolls
    tl.to(heroState, { assemble: 1, duration: 6.4 }, 0.4)

    // 3. intro sentence, word by word
    tl.to('.iw', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.08 }, 4.4)

    // 4. actions arrive once the idea and portrait have settled
    tl.to(lateFades, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }, 6.6)

    // progress line along the bottom edge
    tl.to('.hero__progress i', { scaleX: 1, duration: 8.1 }, 0)
    tl.to({}, { duration: 0.45 }, 7.65)
  }, el)

  document.fonts?.ready.then(() => ScrollTrigger.refresh())
  emit('ready')
})

onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section id="ch1" ref="root" class="chapter hero" data-hero-pose="front" data-hero-final-deg="0" data-hero-scroll-release="front-pose">
    <!-- full-screen particle layer: no box, no border, sits directly on the page background -->
    <div class="hero__stage" aria-hidden="true">
      <ClientOnly>
        <ParticlePortrait src="/portrait-body.png" :state="heroState" :final-deg="0" :anchor-x="0.5" />
      </ClientOnly>
    </div>

    <button class="hero__skip mono" type="button" @click="skipIntro">Skip intro ↓</button>

    <div class="container hero__grid">
      <div class="hero__copy">
        <h1 class="hero__title" aria-label="Human ideas. Tangible technology.">
          <span class="line" aria-hidden="true">
            <span v-for="(w, wi) in line1" :key="'a' + wi" class="word"><span v-for="(ch, ci) in w" :key="ci" class="char">{{ ch }}</span></span>
          </span>
          <em class="line emotional" aria-hidden="true">
            <span v-for="(w, wi) in line2" :key="'b' + wi" class="word"><span v-for="(ch, ci) in w" :key="ci" class="char">{{ ch }}</span></span>
          </em>
        </h1>

        <p class="hero__intro">
          <template v-for="(w, i) in introWords" :key="i"><span class="iw">{{ w }}</span>{{ ' ' }}</template>
          <span class="hero__cursor" aria-hidden="true">▌</span>
        </p>

        <div class="hero__actions">
          <a class="btn btn-primary" href="#ch7" @click="scrollTo('ch7', $event)">See the work <span aria-hidden="true">↗</span></a>
          <a class="link-underline hero__ask" href="#ch9" @click="scrollTo('ch9', $event)">Ask the machine <span aria-hidden="true">↗</span></a>
        </div>
        <button class="hero__next" type="button" aria-label="Go to Origin section" @click="scrollTo('ch2')">
          
        </button>
      </div>
    </div>

    <div class="hero__progress" aria-hidden="true"><i></i></div>
  </section>
</template>

<style scoped>
.hero { position: relative; min-height: 100svh; padding-top: clamp(84px, 10vh, 124px); padding-bottom: clamp(24px, 4vh, 48px); display: grid; align-items: center; overflow: hidden; }

/* full-screen WebGL layer behind the text */
.hero__stage { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.hero__grid { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 52%); }
.hero__copy { max-width: 720px; }
.hero__title { display: grid; margin-top: 0; max-width: 12ch; font-size: clamp(58px, 6.4vw, 100px); letter-spacing: -.06em; line-height: .9; }
.hero__title em { margin-top: .12em; color: var(--accent); }
.hero__intro { min-height: 4.9em; max-width: 49ch; margin-top: clamp(24px, 3.4vw, 48px); color: var(--ink); font-size: clamp(18px, 1.8vw, 25px); line-height: 1.35; }
.hero__cursor { display: inline-block; margin-left: 3px; color: var(--accent); animation: cursor-blink .8s step-end infinite; }
.hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 24px; margin-top: 24px; }
.hero__ask { color: var(--ink); font-size: 14px; }
.hero__next { display: inline-flex; align-items: center; gap: 16px; margin-top: clamp(28px, 4.5vw, 60px); color: var(--muted); }
.hero__next:hover { color: var(--accent); }
.hero__next > span:last-child { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--line-strong); }

/* letter / word animation targets */
.line { display: block; }
.word { display: inline-block; white-space: nowrap; margin-right: .24em; }
.char, .iw { display: inline-block; will-change: transform, filter, opacity; }
/* avoid a flash of final text before JS prepares the animation */
.hero:not(.is-static):not(.is-ready) .char,
.hero:not(.is-static):not(.is-ready) .iw { opacity: 0; }

/* progress line while the hero is pinned */
.hero__progress { position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; height: 2px; background: var(--line); }
.hero__progress i { display: block; height: 100%; background: var(--accent); transform-origin: left; transform: scaleX(0); }
.hero.is-static .hero__progress { display: none; }

/* skip link: invisible until focused */
.hero__skip { position: absolute; top: 14px; right: 16px; z-index: 40; padding: 8px 12px; border: 1px solid var(--line-strong); background: var(--bg, #fff); color: var(--ink); font-size: 10px; opacity: 0; pointer-events: none; }
.hero__skip:focus-visible { opacity: 1; pointer-events: auto; outline: 2px solid var(--accent); outline-offset: 2px; }
.hero.is-static .hero__skip { display: none; }

@keyframes cursor-blink { 50% { opacity: 0; } }

/* tablet + phone: the hero is pinned, so everything must fit in ONE screen */
@media (max-width: 980px) {
  .hero { height: 100svh; min-height: 0; padding-top: 76px; padding-bottom: 18px; align-items: start; }
  .hero__stage { opacity: .5; } /* portrait sits behind the text, so soften it */
  .hero__grid { grid-template-columns: minmax(0, 100%); }
  .hero__title { max-width: 14ch; margin-top: 0; font-size: clamp(40px, 10.5vw, 68px); }
  .hero__intro { min-height: 0; margin-top: 12px; font-size: clamp(14px, 3.6vw, 18px); }
  .hero__actions { margin-top: 12px; gap: 16px; }
  .hero__next { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__cursor { animation: none; }
}
</style>
