<script setup lang="ts">
/** Persistent compact entry point. It deliberately shares the MEG chat's
 * singleton transcript with the full Ch9 surface. */
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from '#imports'
import { useTelebotChat } from '~/composables/useTelebotChat'
import { chatSourceSchema } from '~~/shared/chat'

const chat = useTelebotChat()
const router = useRouter()
const expanded = ref(false)
const input = ref('')
const pillRef = ref<HTMLButtonElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const currentAnswer = computed(() => [...chat.turns.value].reverse().find(turn => turn.role === 'assistant'))

const statusCopy = computed(() => {
  if (chat.pending.value) return 'Generating…'
  if (currentAnswer.value?.offline) return 'Saved catalog mode'
  return chat.routing.value === 'live' ? 'Live routing · grounded' : 'Grounded · shared transcript'
})

function safeSources(sources: Array<{ label: string; href: string }>) {
  return sources.filter(source => chatSourceSchema.safeParse(source).success && chat.isSafeSource(source.href))
}

async function send() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await chat.send(text)
}

function openFull() {
  expanded.value = false
  if (router.currentRoute.value.path !== '/') {
    void router.push('/#ch9').then(() => document.getElementById('ch9')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  } else document.getElementById('ch9')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeMini() { expanded.value = false }

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); closeMini(); return }
  if (event.key === 'Enter') {
    event.preventDefault()
    void send()
  }
}

watch(expanded, async (isOpen) => {
  await nextTick()
  if (isOpen) inputRef.value?.focus()
  else pillRef.value?.focus()
})
</script>

<template>
    <aside class="mini" :class="{ expanded }" aria-label="Quick MEG chat">
      <button v-if="!expanded" ref="pillRef" type="button" class="mini__pill" aria-label="Open quick MEG chat" @click="expanded = true">
      <span class="mini__dot" aria-hidden="true">✦</span>
      <span>Ask MEG</span>
      <span class="mini__arrow" aria-hidden="true">↗</span>
    </button>

    <section v-else class="mini__panel" tabindex="-1" aria-label="Quick MEG chat" @keydown.esc.prevent="closeMini">
      <header class="mini__head">
        <div>
          <div class="mini__title">Ask MEG</div>
          <div class="mini__sub mono eyebrow">{{ statusCopy }}</div>
        </div>
        <div class="mini__actions">
          <button type="button" class="mini__action" aria-label="Open full Ask chapter" title="Open full Ask chapter" @click="openFull">↗</button>
          <button type="button" class="mini__action" aria-label="Close quick chat" @click="expanded = false">×</button>
        </div>
      </header>

      <div class="mini__transcript" role="log" aria-live="polite" aria-label="Quick transcript">
        <article v-for="turn in chat.turns.value.slice(-4)" :key="turn.id" class="mini__turn" :class="turn.role">
          <span class="mono eyebrow">{{ turn.role === 'assistant' ? 'MEG' : 'YOU' }}</span>
          <p>{{ turn.text }}<span v-if="turn.role === 'assistant' && !turn.finished" aria-hidden="true">▌</span></p>
        </article>
      </div>

       <div class="mini__latest" v-if="currentAnswer?.sources?.length">
         <a v-for="source in safeSources(currentAnswer.sources).slice(0, 2)" :key="source.href" :href="source.href">{{ source.label }} ↗</a>
       </div>

      <form class="mini__input-row" @submit.prevent="send">
        <label class="sr-only" for="mini-telebot-message">Your message to MEG</label>
         <input id="mini-telebot-message" ref="inputRef" v-model="input" class="mini__input" maxlength="1200" :disabled="chat.pending.value" placeholder="Ask from the record…" @keydown="onKey">
        <button v-if="chat.pending.value" type="button" class="mini__send btn btn-ghost" @click="chat.cancel">Cancel</button>
        <button v-else type="submit" class="mini__send btn btn-primary" :disabled="!input.trim()">Send</button>
      </form>
       <button
         type="button"
         class="mini__mode"
         :aria-pressed="chat.mode.value === 'recruiter'"
         :aria-label="chat.mode.value === 'visitor' ? 'Switch to recruiter mode' : 'Switch to visitor mode'"
         @click="chat.mode.value = chat.mode.value === 'visitor' ? 'recruiter' : 'visitor'"
       >{{ chat.mode.value === 'visitor' ? 'Visitor mode' : 'Recruiter mode' }}</button>
    </section>
  </aside>
</template>

<style scoped>
.mini { position:fixed; right:1.25rem; bottom:5.75rem; z-index:120; }
.mini__pill { display:inline-flex; align-items:center; gap:var(--space-3); padding:.68rem 1rem .68rem .72rem; border:1px solid color-mix(in oklab,var(--accent) 36%,transparent); border-radius:999px; background:var(--surface); color:var(--ink); box-shadow:0 18px 48px -25px color-mix(in oklab,var(--ink) 60%,transparent); cursor:pointer; font:inherit; transition:transform var(--dur-200),border-color var(--dur-200); }
.mini__pill:hover { transform:translateY(-2px); border-color:var(--accent); }
.mini__dot { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; background:var(--accent); color:var(--bg); font-family:var(--font-tv); }
.mini__arrow { color:var(--accent); }
.mini__panel { width:min(380px,calc(100vw - 2rem)); display:grid; grid-template-rows:auto minmax(140px,260px) auto auto auto; gap:var(--space-3); overflow:hidden; background:var(--surface); border:1px solid color-mix(in oklab,var(--ink) 13%,transparent); border-radius:var(--r-lg); box-shadow:0 30px 80px -30px color-mix(in oklab,var(--ink) 60%,transparent); animation:mini-in 220ms var(--ease-out3); }
.mini__head { display:flex; justify-content:space-between; align-items:center; padding:var(--space-4); border-bottom:1px solid color-mix(in oklab,var(--ink) 10%,transparent); }
.mini__title { font-size:var(--fs-14); font-weight:600; }
.mini__sub { margin-top:.2rem; color:var(--muted); }
.mini__actions { display:flex; gap:var(--space-1); }
.mini__action { width:30px; height:30px; border:1px solid color-mix(in oklab,var(--ink) 16%,transparent); border-radius:50%; background:transparent; color:var(--ink); cursor:pointer; }
.mini__action:hover { color:var(--accent); border-color:var(--accent); }
.mini__transcript { display:grid; align-content:start; gap:var(--space-3); padding:var(--space-3) var(--space-4); overflow:auto; }
.mini__turn { display:grid; gap:.25rem; }
.mini__turn.user { justify-items:end; }
.mini__turn p { max-width:92%; margin:0; padding:.55rem .72rem; border-radius:var(--r-md); font-size:var(--fs-12); line-height:1.55; white-space:pre-wrap; word-break:break-word; }
.mini__turn.assistant p { background:color-mix(in oklab,var(--accent) 8%,transparent); }
.mini__turn.user p { background:var(--ink); color:var(--bg); }
.mini__latest { display:flex; flex-wrap:wrap; gap:var(--space-2); padding:0 var(--space-4); }
.mini__latest a { color:var(--accent); font-size:var(--fs-12); }
.mini__input-row { display:grid; grid-template-columns:1fr auto; gap:var(--space-2); padding:0 var(--space-4); }
.mini__input { min-width:0; padding:.62rem .82rem; border:1px solid color-mix(in oklab,var(--ink) 16%,transparent); border-radius:999px; outline:0; background:var(--bg); color:var(--ink); font:inherit; font-size:var(--fs-12); }
.mini__input:focus { border-color:var(--accent); }
.mini__send { border-radius:999px; }
.mini__mode { justify-self:start; margin:0 var(--space-4) var(--space-4); padding:0; border:0; background:transparent; color:var(--muted); cursor:pointer; font:inherit; font-size:var(--fs-12); text-decoration:underline; }
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@keyframes mini-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@media (max-width:540px) { .mini { right:.65rem; bottom:4.8rem; left:.65rem; } .mini__panel { width:100%; } }
</style>
