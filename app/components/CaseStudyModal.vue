<script setup lang="ts">
/**
 * CaseStudyModal.vue — full viewport modal with focus trap + ←/→ arrow nav + Esc close.
 * Content drawn from single project item (ProjectsSection emits open(id)).
 *
 * NOTE: Raw Project shape differs from the original template expectations.
 * Key normalisations applied via computed below:
 *  - no `oneLiner` field → derive from subtitle/scope/role.
 *  - `outcome` is a single { metric, before, after } object (NOT { text, metrics[] }).
 *  - `media` is an array of MediaItem objects { type, src, alt } (NOT plain strings) →
 *    placeholder check performed against src field.
 */
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from 'vue'
import { useProjects } from '~/composables/usePortfolioContent'
import type { Project, Outcome, MediaItem } from '~~/types/content'

const props = defineProps<{ isOpen: boolean; projectId: string | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'navigate', id: string): void
}>()

const { items } = useProjects()
const current = computed((): Project | null => items.find(i => i.id === props.projectId) || null)
const currentIdx = computed(() => items.findIndex(i => i.id === props.projectId))

const nextProject = () => {
  if (currentIdx.value === -1) return
  const next = items[(currentIdx.value + 1) % items.length]
  emit('navigate', next.id)
}
const prevProject = () => {
  if (currentIdx.value === -1) return
  const prev = items[(currentIdx.value - 1 + items.length) % items.length]
  emit('navigate', prev.id)
}

/* -------- Derived fields (shape normalisation) -------- */

/** Short one-line sub-header. JSON schema has no `oneLiner` — build from subtitle > scope > type + role. */
const oneLiner = computed(() => {
  const c = current.value
  if (!c) return ''
  if (c.subtitle) return c.subtitle
  const parts: string[] = []
  if (c.scope) parts.push(c.scope)
  if (c.role) parts.push(c.role)
  if (!parts.length && c.type) parts.push(c.type)
  return parts.join(' · ')
})

/** Outcome is stored as a single object in JSON. Template used to render { text, metrics[] }. */
const outcomeMetrics = computed<Array<Outcome & { isPlaceholder: boolean }>>(() => {
  const o = current.value?.outcome
  if (!o) return []
  // Treat outcome as a single row with metric + before → after
  const isPlaceholder =
    (typeof o.after === 'string' && o.after.startsWith('[PLACEHOLDER')) ||
    (typeof o.metric === 'string' && o.metric.startsWith('[PLACEHOLDER'))
  return [{ ...o, isPlaceholder }]
})

/** Normalised media entries with explicit placeholder check on the `src` field. */
const mediaItems = computed<Array<MediaItem & { isPlaceholder: boolean }>>(() => {
  return (current.value?.media ?? []).map(m => ({
    ...m,
    isPlaceholder: typeof m.src === 'string' && m.src.startsWith('[PLACEHOLDER')
  }))
})

/* -------- focus trap + keys -------- */

const rootRef = ref<HTMLElement | null>(null)
let lastFocused: HTMLElement | null = null

function onKey(e: KeyboardEvent) {
  if (!props.isOpen) return
  if (e.key === 'Escape') { emit('close'); return }
  if (e.key === 'ArrowRight') { nextProject(); return }
  if (e.key === 'ArrowLeft') { prevProject(); return }
  if (e.key !== 'Tab') return
  const tabbables = rootRef.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])') ?? []
  if (!tabbables.length) return
  const first = tabbables[0], last = tabbables[tabbables.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

watch(() => props.isOpen, async (open) => {
  if (!open) {
    if (lastFocused instanceof HTMLElement) try { lastFocused.focus() } catch {}
    return
  }
  lastFocused = document.activeElement as HTMLElement || null
  await nextTick()
  const tabbables = rootRef.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])') ?? []
  if (tabbables.length) tabbables[0].focus()
})

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="csm" role="dialog" aria-modal="true" :aria-labelledby="`csm-title-${projectId}`">
      <div class="csm__backdrop" @click.self="emit('close')"></div>

      <article ref="rootRef" v-if="current" class="csm__panel" tabindex="-1">
        <header class="csm__head">
          <button class="csm__close" type="button" aria-label="Close" @click="emit('close')">×</button>
          <span class="mono counter eyebrow">{{ current.id }}</span>
          <span class="chip chip-accent">{{ current.type }}</span>
        </header>

        <div class="csm__body">
          <h1 class="csm__title d-120" :id="`csm-title-${projectId}`">
            {{ current.title }}
            <span class="csm__year mono">{{ current.year }}</span>
          </h1>

          <p class="csm__one">{{ oneLiner }}</p>

          <section class="csm__two-col">
            <div>
              <div class="eyebrow mono">Problem</div>
              <p>{{ current.problem }}</p>
            </div>
            <div>
              <div class="eyebrow mono">Solution</div>
              <p>{{ current.solution }}</p>
            </div>
          </section>

          <section>
            <div class="eyebrow mono">Three key decisions</div>
            <ol class="csm__decisions">
              <li v-for="(d, i) in current.keyDecisions" :key="i">
                <span class="mono counter">D{{ i + 1 }}</span>
                <p>{{ d }}</p>
              </li>
            </ol>
          </section>

          <section class="csm__two-col">
            <div>
              <div class="eyebrow mono">Stack</div>
              <ul class="tag-list">
                <li v-for="t in current.stack" :key="t" class="tag">{{ t }}</li>
              </ul>
            </div>
            <div>
              <div class="eyebrow mono">Outcome</div>
              <ul class="csm__metrics">
                <li v-for="m in outcomeMetrics" :key="m.metric" :class="{ placeholder: m.isPlaceholder }">
                  <span class="mono eyebrow">{{ m.metric }}</span>
                  <template v-if="!m.isPlaceholder"><b>{{ m.after }}</b>
                     <span style="opacity:.6" v-if="m.before"> · before {{ m.before }}</span></template>
                  <span v-else class="mono eyebrow">[ PLACEHOLDER ]</span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <div class="eyebrow mono">Media</div>
            <div class="csm__media-grid">
              <div v-for="(m, i) in mediaItems" :key="i" class="csm__media-cell" :class="{ placeholder: m.isPlaceholder }">
                <span v-if="m.isPlaceholder" class="mono eyebrow">{{ m.src }}</span>
                <img v-else :src="m.src" :alt="m.alt || m.type" class="csm__media-img" />
              </div>
            </div>
          </section>

          <section class="csm__links">
            <a v-for="l in current.links" :key="l.href" class="btn btn-primary magnetic-target" data-cursor-cta
              :href="l.href"
              :target="l.href.startsWith('http') ? '_blank' : undefined"
              :rel="l.href.startsWith('http') ? 'noopener noreferrer' : undefined">
              {{ l.label }} ↗
              <span v-if="l.confirmNeeded" class="mono eyebrow" style="opacity:.55; margin-left: var(--space-2)">[verify]</span>
            </a>
          </section>
        </div>

        <footer class="csm__foot">
          <button class="btn btn-ghost" type="button" @click="prevProject" aria-label="Previous project">← Prev</button>
          <span class="mono eyebrow">PRJCT · {{ String(currentIdx + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}</span>
          <button class="btn btn-ghost" type="button" @click="nextProject" aria-label="Next project">Next →</button>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.csm { position: fixed; inset: 0; z-index: 300; }
.csm__backdrop { position: absolute; inset: 0; background: color-mix(in oklab, var(--ink) 50%, transparent); animation: csmFade 200ms var(--ease-out3); }
.csm__panel {
  position: relative;
  margin: 4vh auto;
  width: min(1080px, 94vw);
  max-height: 92vh;
  background: var(--bg);
  border: 1px solid color-mix(in oklab, var(--ink) 10%, transparent);
  border-radius: var(--r-lg);
  overflow: hidden;
  display: grid; grid-template-rows: auto 1fr auto;
  animation: csmIn 300ms var(--ease-out3);
}
.csm__head {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-4) var(--pad-x);
  border-bottom: 1px solid color-mix(in oklab, var(--ink) 10%, transparent);
}
.csm__close {
  margin-left: auto;
  width: 40px; height: 40px; border-radius: 999px; border: 1px solid color-mix(in oklab, var(--ink) 18%, transparent);
  background: transparent; color: var(--ink); cursor: pointer; font-size: 22px;
}
.csm__close:hover { color: var(--accent); border-color: var(--accent); }
.csm__body {
  padding: var(--space-8) var(--pad-x);
  overflow: auto;
  display: grid; gap: var(--space-8);
}
.csm__title { margin: 0; line-height: var(--lh-tight); letter-spacing: var(--ls-display); }
.csm__year { display: inline-block; margin-left: var(--space-3); color: var(--accent); font-size: var(--fs-28); vertical-align: top; margin-top: 1.2em; }
.csm__one { font-size: var(--fs-18); color: var(--ink); max-width: var(--measure); }
.csm__two-col { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-8); }
.csm__two-col p { margin: var(--space-3) 0 0; color: var(--ink); line-height: 1.6; }
.csm__decisions { list-style: none; padding: 0; margin: var(--space-4) 0 0; display: grid; gap: var(--space-3); }
.csm__decisions li {
  display: grid; grid-template-columns: auto 1fr; gap: var(--space-4); align-items: baseline;
  padding: var(--space-4);
  border-radius: var(--r-md);
  background: color-mix(in oklab, var(--accent) 4%, transparent);
}
.csm__decisions p { margin: 0; }
.tag-list { list-style: none; padding: 0; margin: var(--space-3) 0 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.tag { padding: .15rem .6rem; border-radius: 999px; background: color-mix(in oklab, var(--ink) 6%, transparent); font-size: var(--fs-12); }
.csm__metrics { list-style: none; margin: var(--space-3) 0 0; padding: 0; display: grid; gap: var(--space-2); }
.csm__metrics li { display: grid; grid-template-columns: 120px 1fr; gap: var(--space-3); padding: var(--space-2) var(--space-3); border-radius: var(--r-sm); background: color-mix(in oklab, var(--ink) 4%, transparent); }
.csm__metrics li b { color: var(--accent); font-weight: 600; }
.csm__metrics li.placeholder { outline: 1px dashed color-mix(in oklab, var(--ink) 20%, transparent); background: transparent; }

.csm__media-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); margin-top: var(--space-3); }
.csm__media-cell {
  aspect-ratio: 4/3; border-radius: var(--r-md);
  background: color-mix(in oklab, var(--accent) 8%, transparent);
  display: grid; place-items: center; padding: var(--space-3); text-align: center; color: var(--muted);
}
.csm__media-cell.placeholder { outline: 1px dashed color-mix(in oklab, var(--ink) 22%, transparent); background: transparent; }
.csm__media-img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit; }

.csm__links { display: flex; flex-wrap: wrap; gap: var(--space-3); }

.csm__foot {
  display: flex; justify-content: space-between; align-items: center;
  padding: var(--space-4) var(--pad-x);
  border-top: 1px solid color-mix(in oklab, var(--ink) 10%, transparent);
}
@keyframes csmFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes csmIn { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

@media (max-width: 780px) {
  .csm__two-col { grid-template-columns: 1fr; gap: var(--space-6); }
  .csm__media-grid { grid-template-columns: 1fr; }
  .csm__metrics li { grid-template-columns: 1fr; gap: var(--space-1); }
}
</style>
