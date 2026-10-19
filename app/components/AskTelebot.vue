<script setup lang="ts">
/** Ask: full grounded chat surface. The MEG canvas is mounted once
 * by the app shell; this section reserves an anchor for that persistent canvas. */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTelebot } from '~/composables/useTelebot'
import { useTelebotChat } from '~/composables/useTelebotChat'
import { chatSourceSchema } from '~~/shared/chat'

const tb = useTelebot()
const chat = useTelebotChat()
const input = ref('')
const transcriptRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fullscreenButton = ref<HTMLButtonElement | null>(null)
const fullscreen = ref(false)
const online = ref(true)
const recruiterOpen = ref(false)

const currentAnswer = computed(() => [...chat.turns.value].reverse().find(turn => turn.role === 'assistant'))
const statusLabel = computed(() => {
  if (chat.status.value === 'pending') return 'Finding the relevant details…'
  if (currentAnswer.value?.offline) return 'Using saved portfolio sources'
  if (chat.status.value === 'cancelled') return 'Reply cancelled'
  if (chat.status.value === 'waiting') return 'A short pause before the next question'
  if (chat.status.value === 'error') return 'Using saved portfolio sources'
  return chat.routing.value === 'live' ? 'Sources are ready' : 'Ready when you are'
})

function scrollTranscript() {
  nextTick(() => {
    const element = transcriptRef.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

async function send(message?: string) {
  const text = (message ?? input.value).trim()
  if (!text) return
  input.value = ''
  await chat.send(text)
  scrollTranscript()
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void send()
  }
}

function setMode(mode: 'visitor' | 'recruiter') {
  chat.mode.value = mode
  recruiterOpen.value = mode === 'recruiter'
}

function safeSources(sources: Array<{ label: string; href: string }>) {
  return sources.filter(source => chatSourceSchema.safeParse(source).success && chat.isSafeSource(source.href))
}

watch(() => chat.turns.value.length, scrollTranscript)

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function onFullscreenKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreen.value) {
    event.preventDefault()
    fullscreen.value = false
  }
}

watch(fullscreen, async (open) => {
  await nextTick()
  if (open) inputRef.value?.focus()
  else fullscreenButton.value?.focus()
})

function onOnline() { online.value = true }
function onOffline() { online.value = false }

onMounted(() => {
  tb.setChapterLabel('ASK')
  online.value = typeof navigator === 'undefined' || navigator.onLine
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})
</script>

<template>
  <section id="ch9" ref="askSection" class="chapter ask" :class="{ 'is-fullscreen': fullscreen }" :role="fullscreen ? 'dialog' : undefined" :aria-modal="fullscreen ? 'true' : undefined" aria-labelledby="ask-title" tabindex="-1" @keydown="onFullscreenKeydown">
    <div class="container">
      <header class="section__head ask__head">
        <h2 id="ask-title" class="d-120 section__title">
          <span class="reveal-line">Ask MEG.</span><br>
          <span class="reveal-line emotional">See what connects.</span>
        </h2>
        <p class="section__lede">Explore the projects, research, and decisions with an assistant grounded in the portfolio. Sources stay attached; unverified details stay unclaimed.</p>
      </header>

      <div class="ask__toolbar" role="toolbar" aria-label="Chat mode">
        <div class="ask__mode-copy">
          <span class="mono eyebrow">Choose a perspective</span>
          <span class="ask__network" :class="{ offline: !online }">{{ online ? 'Online' : 'Offline · saved answers available' }}</span>
        </div>
        <div class="ask__mode-buttons" role="group" aria-label="Choose conversation mode">
          <button type="button" class="ask__mode" :class="{ active: chat.mode.value === 'visitor' }" :aria-pressed="chat.mode.value === 'visitor'" @click="setMode('visitor')">Visitor</button>
          <button type="button" class="ask__mode" :class="{ active: chat.mode.value === 'recruiter' }" :aria-pressed="chat.mode.value === 'recruiter'" @click="setMode('recruiter')">Recruiter brief</button>
          <button ref="fullscreenButton" type="button" class="ask__mode ask__fullscreen" :aria-pressed="fullscreen" :aria-label="fullscreen ? 'Exit full-screen Ask mode' : 'Open full-screen Ask mode'" @click="toggleFullscreen">{{ fullscreen ? 'Exit full-screen' : 'Full-screen Ask' }}</button>
        </div>
      </div>

      <div v-if="recruiterOpen" class="ask__recruiter" aria-label="Recruiter brief">
        <label><span class="mono eyebrow">Company</span><input v-model="chat.recruiter.company" maxlength="160" placeholder="Company name (optional)"></label>
        <label><span class="mono eyebrow">Role</span><input v-model="chat.recruiter.role" maxlength="160" placeholder="Role or team need"></label>
        <label><span class="mono eyebrow">Need</span><input v-model="chat.recruiter.need" maxlength="160" placeholder="What are you trying to build?"></label>
        <p class="mono ask__privacy">Tailoring is based only on this brief and the public portfolio content. It is a starting point, not a guaranteed fit.</p>
      </div>

      <div class="ask__layout">
        <aside class="ask__prompt-panel" aria-label="Suggested questions">
          <div class="eyebrow mono">Explore a topic</div>
          <div class="ask__chips">
            <button v-for="(chip, index) in chat.chips" :key="chip" type="button" class="ask__chip" :disabled="chat.pending.value" @click="send(chip)">
              <span class="mono counter">{{ String(index + 1).padStart(2, '0') }}</span>
              <span>{{ chip }}</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div class="ask__anchor-card">
            <div class="ask__anchor-heading"><span class="mono eyebrow">MEG / LIVE INTERFACE</span><span class="ask__live-dot" aria-hidden="true"></span></div>
            <div data-telebot-anchor="ask" class="ask__telebot-anchor">
               <span class="ask__anchor-mark" aria-hidden="true">TV</span>
            </div>
          </div>
        </aside>

        <div class="ask__conversation">
          <div ref="transcriptRef" class="ask__transcript" role="log" aria-live="polite" aria-relevant="additions text" aria-label="MEG transcript">
            <article v-for="turn in chat.turns.value" :key="turn.id" class="turn" :class="[turn.role, { offline: turn.offline, cancelled: turn.cancelled }]">
              <header class="turn__head">
                <span class="mono counter">{{ turn.role === 'assistant' ? 'MEG' : 'YOU' }}</span>
                <span v-if="turn.offline" class="chip chip-muted">Saved path</span>
                <span v-if="turn.cancelled" class="chip chip-muted">Cancelled</span>
              </header>
              <p class="turn__text">{{ turn.text }}<span v-if="turn.role === 'assistant' && !turn.finished" class="turn__cursor" aria-hidden="true">▌</span></p>
              <nav v-if="turn.sources.length" class="turn__sources" aria-label="Sources">
                <span class="mono eyebrow">Sources</span>
               <a v-for="source in safeSources(turn.sources)" :key="`${turn.id}-${source.href}-${source.label}`" :href="source.href">{{ source.label }} ↗</a>
              </nav>
              <div v-if="turn.tools.length" class="turn__tools" aria-label="Available actions">
                <span v-for="tool in turn.tools" :key="`${turn.id}-${tool.name}`" class="mono eyebrow">{{ tool.name.replaceAll('_', ' ') }}</span>
              </div>
            </article>
          </div>

          <div id="telebot-transcript-live" class="sr-live" aria-live="polite" aria-atomic="true">{{ currentAnswer?.text ?? '' }}</div>

          <form class="ask__input-row" @submit.prevent="send()">
            <label class="sr-only" for="telebot-message">Your message to MEG</label>
            <textarea id="telebot-message" ref="inputRef" v-model="input" class="ask__input" rows="1" maxlength="1200" :disabled="chat.pending.value" placeholder="Ask from the record…" @keydown="onKey"></textarea>
            <button v-if="chat.pending.value" type="button" class="ask__send btn btn-ghost" @click="chat.cancel">Cancel</button>
            <button v-else type="submit" class="ask__send btn btn-primary" :disabled="!input.trim()">Send ↗</button>
          </form>
          <div class="ask__status" role="status">
            <span class="mono eyebrow">{{ statusLabel }}</span>
            <span v-if="chat.error.value" class="ask__error">{{ chat.error.value }}</span>
            <button v-if="chat.status.value === 'error' || chat.status.value === 'cancelled'" type="button" class="ask__reset" @click="chat.reset">Reset transcript</button>
          </div>
        </div>
      </div>

      <p class="mono ask__footnote">Answers are grounded in the public portfolio. Follow a source to see the original project or record.</p>
    </div>
  </section>
</template>

<style scoped>
.ask { padding: var(--space-20) 0; }
.section__lede { margin-top: var(--space-3); color: var(--muted); max-width: var(--measure); }
.ask__toolbar { display:flex; align-items:center; justify-content:space-between; gap:var(--space-4); margin-top:var(--space-7); padding:var(--space-3) 0; border-top:1px solid color-mix(in oklab,var(--ink) 14%,transparent); border-bottom:1px solid color-mix(in oklab,var(--ink) 14%,transparent); }
.ask__mode-copy { display:flex; flex-wrap:wrap; gap:var(--space-3); align-items:center; }
.ask__network { color:var(--accent); font-size:var(--fs-12); }
.ask__network.offline { color:var(--muted); }
.ask__mode-buttons { display:flex; gap:3px; padding:3px; border:1px solid color-mix(in oklab,var(--ink) 16%,transparent); border-radius:6px; }
.ask__mode { border:1px solid transparent; background:transparent; color:var(--muted); border-radius:3px; padding:.52rem .78rem; cursor:pointer; font:inherit; font-size:var(--fs-12); transition:background .2s ease,color .2s ease; }
.ask__mode.active,.ask__mode:hover { color:var(--ink); background:var(--surface); border-color:color-mix(in oklab,var(--ink) 8%,transparent); }
.ask__recruiter { display:grid; grid-template-columns:repeat(3,1fr); gap:var(--space-3); margin-top:var(--space-3); padding:var(--space-4); background:color-mix(in oklab,var(--accent) 6%,var(--surface)); border:1px solid color-mix(in oklab,var(--accent) 20%,transparent); border-radius:var(--r-md); }
.ask__recruiter label { display:grid; gap:var(--space-2); }
.ask__recruiter input { width:100%; padding:.7rem .8rem; border:1px solid color-mix(in oklab,var(--ink) 16%,transparent); border-radius:var(--r-sm); background:var(--bg); color:var(--ink); font:inherit; }
.ask__privacy { grid-column:1/-1; color:var(--muted); font-size:var(--fs-12); }
.ask__layout { margin-top:20px; display:grid; grid-template-columns:minmax(250px,.72fr) minmax(0,1.45fr); gap:var(--space-4); min-height:500px; }
.ask__prompt-panel,.ask__conversation { border:1px solid color-mix(in oklab,var(--ink) 11%,transparent); border-radius:6px; }
.ask__prompt-panel { display:grid; align-content:start; gap:20px; padding:var(--space-5); }
.ask__conversation { --ink:#f4f1e9; --muted:#b7c0b5; --bg:#202725; --surface:#2b3530; --accent:#c8dc98; background:#202725; border-color:rgba(244,241,233,.12); color:#f4f1e9; }
.ask__chips { display:grid; gap:var(--space-2); }
.ask__chip { display:grid; grid-template-columns:auto 1fr auto; gap:var(--space-3); align-items:center; width:100%; padding:var(--space-4) 2px; border:0; border-bottom:1px solid color-mix(in oklab,var(--ink) 12%,transparent); border-radius:0; background:transparent; color:var(--ink); cursor:pointer; text-align:left; font:inherit; font-size:var(--fs-14); transition:color var(--dur-200),padding var(--dur-200); }
.ask__chip:hover:not(:disabled) { transform:translateX(4px); border-color:color-mix(in oklab,var(--accent) 40%,transparent); background:color-mix(in oklab,var(--accent) 8%,transparent); }
.ask__chip:disabled { opacity:.6; cursor:not-allowed; }
.ask__chip .counter { color:var(--accent); }
.ask__anchor-card { display:grid; gap:var(--space-3); padding-top:var(--space-4); border-top:1px solid color-mix(in oklab,var(--ink) 18%,transparent); color:var(--muted); font-size:var(--fs-12); }
.ask__anchor-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.ask__anchor-heading .eyebrow { font-size:9px; }
.ask__live-dot { width:7px; height:7px; border-radius:50%; background:#8db464; box-shadow:0 0 0 4px color-mix(in oklab,#8db464 18%,transparent); }
.ask__telebot-anchor { position:relative; display:flex; gap:var(--space-3); align-items:flex-end; min-height:220px; height:clamp(220px, 22vw, 290px); padding:var(--space-3); overflow:hidden; background:color-mix(in oklab,var(--accent) 8%,transparent); background-image:linear-gradient(color-mix(in oklab,var(--ink) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in oklab,var(--ink) 5%,transparent) 1px,transparent 1px); background-size:24px 24px; }
.ask__anchor-mark { display:grid; place-items:center; width:38px; height:38px; border-radius:8px; background:var(--accent); color:var(--bg); font-family:var(--font-tv); font-size:var(--fs-18); }
.ask__conversation { display:grid; grid-template-rows:1fr auto auto; min-width:0; padding:clamp(18px, 2.4vw, 30px); }
.ask__transcript { display:grid; align-content:start; gap:20px; min-height:290px; max-height:500px; overflow:auto; padding:var(--space-2) var(--space-2) var(--space-4) 0; scroll-behavior:smooth; }
.turn { display:grid; gap:var(--space-2); }
.turn.user { justify-items:end; }
.turn__head { display:flex; align-items:center; gap:var(--space-2); }
.turn.assistant .turn__head .counter { color:var(--accent); }
.turn__text { margin:0; max-width:70ch; padding:13px; border-radius:var(--r-md); line-height:1.62; white-space:pre-wrap; word-break:break-word; font-size:var(--fs-14); }
.turn.assistant .turn__text { background:color-mix(in oklab,var(--accent) 7%,transparent); border-top-left-radius:4px; }
.turn.assistant:first-child .turn__text { max-width:54ch; padding:0 0 0 17px; border-left:2px solid var(--accent); border-radius:0; background:transparent; color:#e6e8df; font-size:clamp(17px, 1.8vw, 22px); line-height:1.5; }
.turn.user .turn__text { background:var(--ink); color:var(--bg); border-top-right-radius:4px; }
.turn.offline .turn__text { outline:1px dashed color-mix(in oklab,var(--ink) 24%,transparent); }
.turn.cancelled .turn__text { opacity:.65; }
.turn__cursor { color:var(--accent); animation:blink .85s steps(2) infinite; }
.turn__sources,.turn__tools { display:flex; flex-wrap:wrap; align-items:center; gap:var(--space-2); padding-left:var(--space-2); }
.turn__sources a { color:var(--accent); font-size:var(--fs-12); text-decoration:none; }
.turn__sources a:hover { text-decoration:underline; }
.turn__tools span { padding:.18rem .4rem; color:var(--muted); border:1px solid color-mix(in oklab,var(--ink) 14%,transparent); border-radius:999px; }
.ask__input-row { display:grid; grid-template-columns:1fr auto; gap:var(--space-2); align-items:end; margin-top:20px; padding:var(--space-2); border:1px solid rgba(244,241,233,.2); border-radius:5px; background:rgba(244,241,233,.055); }
.ask__input { width:100%; resize:vertical; min-height:44px; max-height:140px; padding:.7rem .85rem; border:0; outline:0; background:transparent; color:var(--ink); font:inherit; line-height:1.4; }
.ask__send { border-radius:4px; white-space:nowrap; }
.ask__status { display:flex; flex-wrap:wrap; justify-content:space-between; gap:var(--space-3); align-items:center; padding:var(--space-3) var(--space-2) 0; color:var(--muted); }
.ask__error { color:var(--warm); font-size:var(--fs-12); }
.ask__reset { border:0; padding:0; background:transparent; color:var(--accent); cursor:pointer; font:inherit; font-size:var(--fs-12); text-decoration:underline; }
.ask__footnote { margin-top:var(--space-3); color:var(--muted); font-size:10px; }
.ask.is-fullscreen { position:fixed; inset:0; z-index:220; overflow:auto; min-height:100dvh; padding:var(--space-7) 0; background:var(--bg); }
.ask.is-fullscreen .container { max-width:1180px; }
.ask.is-fullscreen .ask__layout { min-height:calc(100dvh - 230px); }
.sr-live,.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@keyframes blink { 50% { opacity:0; } }
@media (max-width: 900px) { .ask__layout { grid-template-columns:1fr; } .ask__prompt-panel { order:2; } .ask__conversation { min-height:460px; } .ask__telebot-anchor { min-height:240px; height:280px; } }
@media (max-width: 640px) { .ask__toolbar,.ask__mode-copy { align-items:flex-start; flex-direction:column; } .ask__recruiter { grid-template-columns:1fr; } .ask__privacy { grid-column:auto; } .ask__conversation { padding:var(--space-4); } }
</style>
