<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useContact } from '~/composables/usePortfolioContent'
import { useSplitReveal } from '~/composables/useSplitReveal'
import { useReveal } from '~/composables/useReveal'
import ParticlePortrait from '~/components/ParticlePortrait.client.vue'

const contact = useContact()
const root = ref<HTMLElement | null>(null)
const orbitHost = ref<HTMLElement | null>(null)
const contactForm = ref<HTMLFormElement | null>(null)
const copied = ref(false)
const now = ref('')
const formStatus = ref('')
const prefersReducedMotion = ref(false)
const contactPortraitState = reactive({ assemble: 0, rotate: 0 })
const orbitProgress = computed(() => Math.min(1, Math.max(0, contactPortraitState.assemble)))
let clock: number | undefined
let orbitContext: gsap.Context | undefined
let refreshOnLoad: (() => void) | undefined

// letters / words: everything with data-split="..."
useSplitReveal(root)
// whole blocks: email, copy button, meta blocks, social links (.reveal-block)
useReveal(root, { selector: '.reveal-block', staggerMs: 90, threshold: 0.15 })

const validEmail = computed(() => typeof contact.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && !contact.email.startsWith('['))
const verifiedSocials = computed(() => (contact.socials ?? []).filter((social) => !social.confirmNeeded && social.href && !social.href.startsWith('[PLACEHOLDER') && /^https?:\/\//.test(social.href)))
const validAvailability = computed(() => typeof contact.availability?.status === 'string' && contact.availability.status && !contact.availability.status.startsWith('[PLACEHOLDER'))

function startOrbit() {
  const host = orbitHost.value
  if (!host) return

  try {
    prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    prefersReducedMotion.value = false
  }

  contactPortraitState.assemble = prefersReducedMotion.value ? 1 : 0
  contactPortraitState.rotate = 0
  if (prefersReducedMotion.value) return

  gsap.registerPlugin(ScrollTrigger)

  orbitContext = gsap.context(() => {
    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        // No ScrollTrigger pin: the stage holds itself with CSS `position: sticky`
        // and the orbit reserves its own scroll room (see .contact__orbit). A JS
        // pin inserts its spacer late and can then sit pinned over the chapters
        // above, which is how "Let's connect" leaked into the awards chapter.
        trigger: host,
        start: 'top top',
        end: 'bottom bottom',
        id: 'contact-orbit',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })

    timeline.to(contactPortraitState, { assemble: 1, duration: 6.4 }, 0.4)
  }, host)

  refreshOnLoad = () => ScrollTrigger.refresh()
  window.addEventListener('load', refreshOnLoad, { once: true })
  requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()))
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
}

function stopOrbit() {
  if (refreshOnLoad) window.removeEventListener('load', refreshOnLoad)
  refreshOnLoad = undefined
  orbitContext?.revert()
  orbitContext = undefined
}

function updateClock() {
  try { now.value = new Intl.DateTimeFormat('en', { timeZone: contact.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) } catch { now.value = '—' }
}
async function copyEmail() {
  if (!validEmail.value || typeof navigator === 'undefined' || !navigator.clipboard) return
  try { await navigator.clipboard.writeText(contact.email); copied.value = true; window.setTimeout(() => { copied.value = false }, 1500) } catch { copied.value = false }
}

function submitContact() {
  const form = contactForm.value
  if (!form || !form.reportValidity()) return

  const data = new FormData(form)
  const name = String(data.get('name') || '').trim()
  const email = String(data.get('email') || '').trim()
  const message = String(data.get('message') || '').trim()
  const subject = encodeURIComponent(`Portfolio hello from ${name}`)
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
  formStatus.value = 'Opening your email app…'
  window.location.href = `mailto:shivangsagar529@gmail.com?subject=${subject}&body=${body}`
}

onMounted(async () => {
  updateClock()
  clock = window.setInterval(updateClock, 1000)
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  startOrbit()
})
onBeforeUnmount(() => {
  if (clock) window.clearInterval(clock)
  stopOrbit()
})
</script>

<template>
  <section id="ch10" ref="root" class="chapter contact">
    <div class="container">
      <div ref="orbitHost" class="contact__orbit" :class="{ 'contact__orbit--reduced': prefersReducedMotion }">
        <div class="contact__orbit-sticky">
          <ClientOnly>
            <ParticlePortrait
              class="contact__orbit-canvas"
              src="/portrait-body.png"
              :state="contactPortraitState"
              :final-deg="0"
              :anchor-x="0.5"
              role="img"
              aria-label="Warm, blurry particles drifting in a column that sharpen into a portrait as you scroll"
              aria-describedby="contact-orbit-description"
            />
          </ClientOnly>
          <p id="contact-orbit-description" class="sr-only">Warm, blurry particles drifting in a column that sharpen into a portrait as you scroll.</p>
          <div class="contact__orbit-copy">
            <p class="mono contact__orbit-kicker">Let's connect</p>
            <h3>Let's talk</h3>
            <p>Scroll and the dust settles into a face.</p>
            <p v-if="prefersReducedMotion" class="contact__orbit-fallback">The portrait is settled for a reduced-motion visit. Use the form below to start a conversation.</p>
          </div>
          <div class="contact__orbit-progress" aria-hidden="true">
            <span>Dust</span>
            <i><b :style="{ transform: `scaleX(${Math.max(0.02, orbitProgress)})` }" /></i>
            <span>Face</span>
          </div>
        </div>
      </div>

      <div class="contact__layout">
        <div class="contact__primary">
          <p class="mono" data-split="slide">Direct line</p>
          <!-- the email is NOT split into letters: it is one long unbreakable word and would overflow on phones -->
          <a v-if="validEmail" class="contact__email reveal-block" :href="`mailto:${contact.email}`">{{ contact.email }}</a>
          <p v-else class="contact__pending mono">Email pending confirmation.</p>
          <button v-if="validEmail" class="link-underline contact__copy reveal-block" type="button" @click="copyEmail">{{ copied ? 'Copied' : 'Copy email' }} <span aria-hidden="true">↗</span></button>

          <form ref="contactForm" class="contact__form reveal-block" action="mailto:shivangsagar529@gmail.com" method="post" enctype="text/plain" @submit.prevent="submitContact">
            <div class="contact__form-head">
              <p class="mono">Send a note</p>
              <p>Native mailto form · no backend</p>
            </div>
            <div class="contact__form-field">
              <label for="contact-name">Name <span aria-hidden="true">*</span></label>
              <input id="contact-name" name="name" type="text" autocomplete="name" required />
            </div>
            <div class="contact__form-field">
              <label for="contact-email">Email <span aria-hidden="true">*</span></label>
              <input id="contact-email" name="email" type="email" autocomplete="email" required />
            </div>
            <div class="contact__form-field">
              <label for="contact-message">Message <span aria-hidden="true">*</span></label>
              <textarea id="contact-message" name="message" rows="5" required></textarea>
            </div>
            <div class="contact__form-actions">
              <button class="btn btn-primary" type="submit">Open email <span aria-hidden="true">↗</span></button>
              <p v-if="formStatus" class="contact__form-status" role="status" aria-live="polite">{{ formStatus }}</p>
            </div>
          </form>
        </div>
        <div class="contact__side">
          <!-- the clock text changes every second, so it is revealed as a block and never split -->
          <div class="contact__meta-block reveal-block"><span class="mono">Local time / {{ contact.timezone }}</span><strong>{{ now || '—' }}</strong></div>
          <div class="contact__meta-block reveal-block"><span class="mono">Availability</span><strong :class="{ 'is-pending': !validAvailability }">{{ validAvailability ? contact.availability.status : 'Status pending confirmation' }}</strong><small v-if="validAvailability">{{ contact.availability.responseTime }}</small></div>
        </div>
      </div>

      <div class="contact__elsewhere">
        <p class="mono" data-split="slide">Elsewhere / confirmed links only</p>
        <ul v-if="verifiedSocials.length">
          <li v-for="(social, index) in verifiedSocials" :key="social.id" class="reveal-block"><span class="mono">{{ String(index + 1).padStart(2, '0') }}</span><a :href="social.href" target="_blank" rel="noopener noreferrer" class="link-underline">{{ social.label }} ↗</a></li>
        </ul>
        <p v-else class="mono contact__pending">No social links are confirmed yet.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact { position: relative; z-index: 1; padding-top: 0; isolation: isolate; background: var(--bg); }
.contact__layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(240px, .6fr); gap: clamp(48px, 10vw, 180px); padding: clamp(28px, 4vw, 58px) 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.contact__primary > .mono, .contact__elsewhere > .mono { color: var(--muted); }
.contact__email { display: inline-block; margin-top: 24px; color: var(--accent); font-size: clamp(34px, 6vw, 86px); line-height: .9; letter-spacing: -.065em; overflow-wrap: anywhere; }.contact__email:hover { color: var(--ink); }
.contact__pending { margin-top: 24px; color: var(--warm); }.contact__copy { display: inline-block; margin-top: 34px; color: var(--ink); font-size: 14px; }
.contact__side { display: grid; align-content: start; gap: 28px; }.contact__meta-block { display: grid; gap: 9px; padding-top: 12px; border-top: 1px solid var(--line); }.contact__meta-block .mono { color: var(--muted); }.contact__meta-block strong { font-size: 20px; font-weight: 500; }.contact__meta-block small { color: var(--muted); font-size: 12px; }.contact__meta-block strong.is-pending { color: var(--warm); font: 11px var(--font-mono); text-transform: uppercase; letter-spacing: .07em; }
.contact__elsewhere { margin-top: clamp(56px, 9vw, 120px); }.contact__elsewhere ul { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 18px; list-style: none; border-top: 1px solid var(--line); }.contact__elsewhere li { display: flex; gap: 18px; align-items: baseline; padding: 16px 0; border-bottom: 1px solid var(--line); }.contact__elsewhere li .mono { color: var(--accent); }.contact__elsewhere li a { color: var(--ink); }
.contact__orbit { position: relative; min-height: 440vh; margin: 0 0 clamp(40px, 6vw, 88px); }
.contact__orbit-sticky { position: sticky; top: 0; z-index: 1; display: grid; min-height: 520px; height: 100vh; height: 100svh; overflow: hidden; isolation: isolate; background: var(--bg); }
.contact__orbit-sticky::before { content: ''; position: absolute; inset: 0; z-index: -1; background: radial-gradient(circle at 70% 52%, color-mix(in srgb, var(--warm) 9%, transparent), transparent 43%); pointer-events: none; }
.contact__orbit-canvas { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; max-width: none; pointer-events: none; }
.contact__orbit-copy { position: absolute; z-index: 1; top: 15%; left: clamp(18px, 5vw, 72px); max-width: min(30rem, 38vw); pointer-events: none; }
.contact__orbit-kicker { margin-bottom: 20px; color: var(--warm); }
.contact__orbit-copy h3 { max-width: 7ch; color: var(--ink); font-size: clamp(52px, 9vw, 132px); line-height: .86; letter-spacing: -.07em; }
.contact__orbit-copy > p:not(.mono):not(.contact__orbit-fallback) { max-width: 18ch; margin-top: 28px; color: var(--muted); font: italic clamp(18px, 2.1vw, 28px)/1.2 var(--font-serif); }
.contact__orbit-fallback { max-width: 31ch; margin-top: 34px; color: var(--muted); font-size: 14px; line-height: 1.55; }
.contact__orbit-progress { position: absolute; right: clamp(18px, 5vw, 72px); bottom: 28px; left: clamp(18px, 5vw, 72px); z-index: 1; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; color: var(--muted); font: 10px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; }
.contact__orbit-progress i { display: block; height: 1px; overflow: hidden; background: var(--line-strong); }
.contact__orbit-progress b { display: block; width: 100%; height: 100%; transform-origin: left; background: var(--warm); transition: transform 120ms linear; }
.contact__orbit--reduced { min-height: 100vh; min-height: 100svh; }
.contact__orbit--reduced .contact__orbit-sticky { position: relative; top: auto; }
.contact__form { display: grid; gap: 18px; margin-top: clamp(56px, 8vw, 110px); padding-top: 28px; border-top: 1px solid var(--line); }
.contact__form-head { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; margin-bottom: 8px; }
.contact__form-head .mono { color: var(--ink); }
.contact__form-head > p:last-child { color: var(--muted); font: 11px var(--font-mono); letter-spacing: .04em; }
.contact__form-field { display: grid; gap: 8px; }
.contact__form-field label { color: var(--muted); font: 11px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
.contact__form-field label span { color: var(--warm); }
.contact__form-field input, .contact__form-field textarea { width: 100%; border: 1px solid var(--line-strong); border-radius: 0; padding: 12px 14px; background: color-mix(in srgb, var(--surface) 72%, transparent); color: var(--ink); outline: 0; transition: border-color var(--dur-s) var(--ease-out), background var(--dur-s) var(--ease-out); }
.contact__form-field textarea { min-height: 132px; resize: vertical; line-height: 1.5; }
.contact__form-field input:focus, .contact__form-field textarea:focus { border-color: var(--accent); background: var(--surface); }
.contact__form-actions { display: flex; flex-wrap: wrap; gap: 18px; align-items: center; margin-top: 6px; }
.contact__form-status { color: var(--muted); font-size: 12px; }
@media (max-width: 720px) {
  .contact__layout { grid-template-columns: 1fr; gap: 44px; }
  .contact__elsewhere ul { grid-template-columns: 1fr; }
   .contact__orbit { min-height: 360vh; margin-bottom: 48px; }
   .contact__orbit-copy { top: 10%; right: 18px; left: 18px; max-width: none; }
  .contact__orbit-copy h3 { font-size: clamp(58px, 18vw, 94px); }
  .contact__orbit-copy > p:not(.mono):not(.contact__orbit-fallback) { margin-top: 18px; }
  .contact__orbit-fallback { margin-top: 24px; }
  .contact__form-head { display: grid; gap: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  .contact__orbit-progress b { transition: none; }
}
</style>
