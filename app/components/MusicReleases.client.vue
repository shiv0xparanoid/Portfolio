<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMusic } from '~/composables/usePortfolioContent'
import { isUsableHref } from '~~/shared/content-model'

const music = useMusic()
const tracks = music.tracks

const currentIndex = ref(0)
const isStatic = ref(false)

const currentTrack = computed(() => tracks[currentIndex.value])
const previousTrack = computed(() => tracks[wrapIndex(currentIndex.value - 1)])
const nextTrack = computed(() => tracks[wrapIndex(currentIndex.value + 1)])
const soundcloudHref = computed(() => {
  const link = music.soundcloud
  return isUsableHref(link.href) && !link.confirmNeeded ? link.href : ''
})

let motionQuery: MediaQueryList | null = null
let dragStartX: number | null = null
let wheelLockedUntil = 0

function wrapIndex(index: number): number {
  if (!tracks.length) return 0
  return (index + tracks.length) % tracks.length
}

// Shortest signed distance from the active disc, e.g. -1, 0, 1 for 3 tracks.
function offsetOf(index: number): number {
  const n = tracks.length
  const half = Math.floor(n / 2)
  return ((index - currentIndex.value + n + half) % n) - half
}

function discStyle(index: number): Record<string, string | number> {
  const off = offsetOf(index)
  const abs = Math.abs(off)
  return {
    '--off': off,
    '--abs': abs,
    zIndex: 10 - abs,
    opacity: abs > 1 ? 0 : 1,
    pointerEvents: abs > 1 ? 'none' : 'auto',
  }
}

function selectTrack(index: number): void {
  if (tracks.length) currentIndex.value = wrapIndex(index)
}
const previous = () => selectTrack(currentIndex.value - 1)
const next = () => selectTrack(currentIndex.value + 1)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') { event.preventDefault(); previous() }
  else if (event.key === 'ArrowRight') { event.preventDefault(); next() }
  else if (event.key === 'Home') { event.preventDefault(); selectTrack(0) }
  else if (event.key === 'End') { event.preventDefault(); selectTrack(tracks.length - 1) }
}

function onWheel(event: WheelEvent): void {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (Math.abs(delta) < 10 || performance.now() < wheelLockedUntil) return
  event.preventDefault()
  wheelLockedUntil = performance.now() + 380
  if (delta > 0) next()
  else previous()
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return
  dragStartX = event.clientX
}

function onPointerUp(event: PointerEvent): void {
  if (dragStartX === null) return
  const distance = event.clientX - dragStartX
  dragStartX = null
  if (Math.abs(distance) > 40) {
    if (distance < 0) next()
    else previous()
  }
}

function onCardClick(index: number): void {
  if (index !== currentIndex.value) selectTrack(index)
}

function onMotionChange(event: MediaQueryListEvent): void {
  isStatic.value = event.matches
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  isStatic.value = motionQuery.matches
  motionQuery.addEventListener?.('change', onMotionChange)
})

onBeforeUnmount(() => {
  motionQuery?.removeEventListener?.('change', onMotionChange)
  motionQuery = null
  dragStartX = null
})
</script>

<template>
  <div
    class="music-releases"
    role="region"
    aria-labelledby="music-releases-title"
    :data-motion-mode="isStatic ? 'static' : 'animated'"
  >
    <div class="music-releases__details">
      <p class="music-releases__count mono" aria-live="polite">
        {{ String(currentIndex + 1).padStart(2, '0') }} / {{ String(tracks.length).padStart(2, '0') }}
      </p>

      <div id="music-releases-title" aria-live="polite" aria-atomic="true">
        <h3 class="music-releases__title">{{ currentTrack?.title || 'No release selected' }}</h3>
        <dl class="music-releases__facts">
          <div>
            <dt class="mono">Release</dt>
            <dd>{{ currentTrack?.meta || 'Released track' }}</dd>
          </div>
          <div>
            <dt class="mono">No.</dt>
            <dd>{{ String(currentIndex + 1).padStart(2, '0') }}</dd>
          </div>
        </dl>
      </div>

      <ol class="music-releases__track-list" aria-label="Released songs">
        <li v-for="(track, index) in tracks" :key="track.id" data-music-track>
          <button
            type="button"
            class="music-releases__track"
            aria-controls="music-releases-stage"
            :aria-current="index === currentIndex ? 'true' : undefined"
            :aria-label="`Show release ${index + 1}: ${track.title}`"
            @click="selectTrack(index)"
          >
            <span class="mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="music-releases__track-name">{{ track.title }}</span>
          </button>
        </li>
      </ol>

      <a
        v-if="soundcloudHref"
        class="extras__soundcloud-link link-underline"
        :href="soundcloudHref"
        target="_blank"
        rel="noopener noreferrer"
      >{{ music.soundcloud.label }} ↗</a>
      <p v-else class="mono pending">SoundCloud link pending confirmation.</p>
    </div>

    <div class="music-releases__visual-column">
      <div
        id="music-releases-stage"
        class="music-releases__stage"
        role="group"
        tabindex="0"
        aria-roledescription="carousel"
        aria-label="Release disc carousel. Use the left and right arrow keys, mouse wheel, or a horizontal swipe to change releases."
        @keydown="onKeydown"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="dragStartX = null"
      >
        <article
          v-for="(track, index) in tracks"
          :key="track.id"
          class="music-releases__disc-wrap"
          :class="`music-releases__disc-wrap--${(index % 3) + 1}`"
          :style="discStyle(index)"
          :data-active="index === currentIndex ? 'true' : 'false'"
          :aria-label="`${track.title}, release ${index + 1} of ${tracks.length}`"
          @click="onCardClick(index)"
        >
          <div class="music-releases__disc">
            <div class="music-releases__face">
              <span class="music-releases__disc-title">{{ track.title }}</span>
              <span class="music-releases__disc-meta mono">{{ track.meta || 'Released track' }}</span>
            </div>
            <span class="music-releases__hub" />
          </div>
        </article>
      </div>

      <div class="music-releases__controls" aria-label="Release navigation">
        <button
          type="button"
          class="music-releases__nav"
          aria-controls="music-releases-stage"
          :aria-label="`Previous release: ${previousTrack?.title || 'previous'}`"
          @click="previous"
        ><span aria-hidden="true">←</span><span>Previous</span></button>
        <p class="music-releases__hint mono">Drag / swipe / arrows / wheel</p>
        <button
          type="button"
          class="music-releases__nav"
          aria-controls="music-releases-stage"
          :aria-label="`Next release: ${nextTrack?.title || 'next'}`"
          @click="next"
        ><span>Next</span><span aria-hidden="true">→</span></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.music-releases {
  --disc: clamp(240px, 32vw, 420px);
  --stage-padding: clamp(18px, 2.4vw, 32px);
  display: grid;
  grid-template-columns: minmax(240px, .58fr) minmax(0, 1.42fr);
  gap: clamp(28px, 6vw, 96px);
  margin-top: clamp(28px, 4vw, 48px);
}

.music-releases__details,
.music-releases__visual-column { min-width: 0; }

.music-releases__details {
  position: relative;
  display: flex;
  flex-direction: column;
  padding-top: clamp(12px, 1.6vw, 20px);
  border-top: 1px solid var(--line-strong);
}

/* ---------- left: editorial information column ---------- */
.music-releases__count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: max-content;
  margin-bottom: clamp(22px, 3vw, 36px);
  color: var(--accent);
  font-size: 11px;
  letter-spacing: .16em;
}
.music-releases__count::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px var(--accent-soft);
}

#music-releases-title {
  position: relative;
  padding-bottom: clamp(20px, 2.8vw, 32px);
  border-bottom: 1px solid var(--line);
}
.music-releases__title {
  font-family: var(--font-display);
  max-width: 10ch;
  font-size: clamp(38px, 5vw, 76px);
  font-weight: 400;
  line-height: .88;
  letter-spacing: -.04em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
  text-wrap: balance;
}
.music-releases__facts { margin: 0 0 clamp(26px, 3vw, 38px); }
.music-releases__facts > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-top: 1px solid var(--ink);
}
.music-releases__facts > div:last-child { border-bottom: 1px solid var(--line); }
.music-releases__facts dt { color: var(--muted); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; padding-top: 3px; }
.music-releases__facts dd { margin: 0; text-align: right; }

.music-releases__track-list {
  list-style: none;
  border-top: 1px solid var(--line);
}
.music-releases__track-list li {
  position: relative;
  border-bottom: 1px solid var(--line);
}
.music-releases__track {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  align-items: baseline;
  min-height: 48px;
  padding: 13px 10px 13px 0;
  text-align: left;
  transition: color var(--dur-s) var(--ease-out), padding var(--dur-s) var(--ease-out), background var(--dur-s) var(--ease-out);
}
.music-releases__track::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-s) var(--ease-out);
}
.music-releases__track > .mono { color: var(--accent); }
.music-releases__track-name { font-size: 17px; overflow-wrap: anywhere; }
.music-releases__track:hover,
.music-releases__track[aria-current='true'] {
  color: var(--accent);
  padding-left: 12px;
  background: linear-gradient(90deg, var(--accent-soft), transparent 78%);
}
.music-releases__track[aria-current='true']::after { transform: scaleX(1); }
.music-releases__track:focus-visible {
  z-index: 1;
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}
.extras__soundcloud-link {
  display: inline-flex;
  align-items: center;
  width: max-content;
  margin-top: clamp(22px, 3vw, 34px);
  color: var(--ink);
  font-size: 14px;
}
.extras__soundcloud-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 5px;
  border-radius: var(--radius-sm);
}
.pending { margin-top: 22px; color: var(--warm); }

/* ---------- right: tilted disc stage ---------- */
.music-releases__stage {
  position: relative;
  isolation: isolate;
  height: clamp(400px, 44vw, 620px);
  overflow: hidden;
  border: 1px solid var(--line);
  border-bottom-color: var(--line-strong);
  background:
    radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent-soft) 42%, transparent), transparent 44%),
    linear-gradient(135deg, color-mix(in srgb, var(--bg-elev) 78%, transparent), color-mix(in srgb, var(--bg-soft) 72%, transparent));
  box-shadow: var(--shadow-2);
  perspective: 1400px;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}
.music-releases__stage::before,
.music-releases__stage::after {
  content: '';
  position: absolute;
  pointer-events: none;
}
.music-releases__stage::before {
  inset: var(--stage-padding);
  z-index: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  opacity: .78;
}
.music-releases__stage::after {
  inset: var(--stage-padding);
  z-index: 0;
  background:
    linear-gradient(90deg, transparent 49.85%, var(--line) 50%, transparent 50.15%),
    linear-gradient(0deg, transparent 49.85%, var(--line) 50%, transparent 50.15%);
  opacity: .45;
}
.music-releases__stage:active { cursor: grabbing; }
.music-releases__stage:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 5px;
  box-shadow: var(--shadow-2), 0 0 0 5px var(--accent-soft);
}

.music-releases__disc-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--disc);
  height: var(--disc);
  margin: calc(var(--disc) / -2) 0 0 calc(var(--disc) / -2);
  /* diagonal path: previous sits lower-left, next sits upper-right */
  transform:
    translate3d(calc(var(--off) * 66%), calc(var(--off) * -26%), calc(var(--abs) * -150px))
    rotateX(58deg) rotateZ(-18deg)
    scale(calc(1 - var(--abs) * .28));
  transform-style: preserve-3d;
  will-change: transform, opacity;
  transition: transform var(--dur-l) var(--ease-out), opacity var(--dur-m) var(--ease-out);
  cursor: pointer;
}
.music-releases__disc-wrap[data-active='true'] { cursor: default; }
.music-releases__disc-wrap::before {
  content: '';
  position: absolute;
  inset: -8%;
  z-index: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  opacity: 0;
  transform: translateZ(-1px);
  transition: opacity var(--dur-m) var(--ease-out), border-color var(--dur-m) var(--ease-out), box-shadow var(--dur-m) var(--ease-out);
  pointer-events: none;
}
.music-releases__disc-wrap[data-active='true']::before {
  border-color: color-mix(in srgb, var(--accent) 62%, transparent);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 9%, transparent);
  opacity: 1;
}

.music-releases__disc-wrap--1 { --release-color: #a3a06c; --release-ink: #1b1b14; }
.music-releases__disc-wrap--2 { --release-color: #14161a; --release-ink: #f2f2ee; }
.music-releases__disc-wrap--3 { --release-color: #bd806b; --release-ink: #1b1410; }

.music-releases__disc {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  /* punch the centre hole */
  -webkit-mask: radial-gradient(circle, transparent 0 7.5%, #000 7.8%);
          mask: radial-gradient(circle, transparent 0 7.5%, #000 7.8%);
  border: 1px solid color-mix(in srgb, var(--release-ink) 24%, transparent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--line-strong) 66%, transparent),
    0 22px 46px -28px color-mix(in srgb, var(--ink) 55%, transparent);
  background:
    radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--release-ink) 16%, transparent) 0 7%, transparent 7.4%),
    var(--release-color);
  overflow: hidden;
}
.music-releases__disc::before,
.music-releases__disc::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}
.music-releases__disc::before {
  inset: 8%;
  border: 1px solid color-mix(in srgb, var(--release-ink) 18%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--release-ink) 8%, transparent);
}
.music-releases__disc::after {
  background: linear-gradient(132deg, color-mix(in srgb, var(--release-ink) 16%, transparent), transparent 32% 64%, color-mix(in srgb, var(--release-ink) 12%, transparent));
  opacity: .7;
}

.music-releases__face {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-content: center;
  gap: 8px;
  padding: 0 14%;
  text-align: center;
  color: var(--release-ink);
  background:
    repeating-radial-gradient(circle, transparent 0 7px, color-mix(in srgb, var(--release-ink) 8%, transparent) 7.5px 8px),
    repeating-conic-gradient(from 7deg, transparent 0 2deg, color-mix(in srgb, var(--release-ink) 3%, transparent) 2.5deg 4deg),
    radial-gradient(circle at 30% 22%, color-mix(in srgb, white 38%, transparent), transparent 40%);
  animation: music-disc-spin 24s linear infinite;
}
.music-releases__disc-wrap[data-active='true'] .music-releases__face { animation-duration: 12s; }

.music-releases__disc-title {
  font: italic 800 clamp(28px, 4vw, 54px)/.9 var(--font-display);
  letter-spacing: -.03em;
  text-transform: uppercase;
  transform: translateY(-34%) rotate(-10deg);
  overflow-wrap: anywhere;
}
.music-releases__disc-meta {
  justify-self: center;
  padding: 5px 9px;
  border: 1px solid color-mix(in srgb, var(--release-ink) 22%, transparent);
  border-radius: var(--radius-pill);
  font-size: 10px;
  letter-spacing: .14em;
  opacity: .78;
  transform: translateY(-30%);
}

/* silver hub ring around the hole */
.music-releases__hub {
  position: absolute;
  inset: 41%;
  z-index: 2;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
  background: radial-gradient(circle at 35% 28%, color-mix(in srgb, white 48%, transparent), color-mix(in srgb, var(--line-strong) 75%, transparent) 54%, color-mix(in srgb, var(--ink) 18%, transparent));
  box-shadow:
    0 0 0 clamp(8px, 1.4vw, 18px) color-mix(in srgb, #cfd3da 88%, transparent),
    inset 0 0 0 1px color-mix(in srgb, white 34%, transparent);
  pointer-events: none;
}

@keyframes music-disc-spin { to { transform: rotate(360deg); } }

/* ---------- controls ---------- */
.music-releases__controls {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.music-releases__hint {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: .1em;
  text-align: center;
}
.music-releases__nav {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 7px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: var(--ls-mono);
  text-transform: uppercase;
  transition: color var(--dur-s) var(--ease-out), transform var(--dur-s) var(--ease-out), border-color var(--dur-s) var(--ease-out), background var(--dur-s) var(--ease-out);
}
.music-releases__nav > span[aria-hidden='true'] {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  font-size: 15px;
  line-height: 1;
  transition: border-color var(--dur-s) var(--ease-out), background var(--dur-s) var(--ease-out);
}
.music-releases__nav:hover {
  border-color: var(--line-strong);
  color: var(--accent);
  background: var(--accent-soft);
}
.music-releases__nav:hover > span[aria-hidden='true'] {
  border-color: currentColor;
  background: var(--bg-elev);
}
.music-releases__nav:first-child:hover { transform: translateX(-3px); }
.music-releases__nav:last-child:hover { transform: translateX(3px); }
.music-releases__nav:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}

/* ---------- responsive ---------- */
@media (max-width: 900px) {
  .music-releases {
    --disc: clamp(260px, 44vw, 420px);
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .music-releases__visual-column { order: -1; }
  .music-releases__details { padding-top: 0; border-top: 0; }
  .music-releases__stage { height: clamp(380px, 64vw, 520px); }
}
@media (max-width: 560px) {
  .music-releases {
    --disc: min(68vw, 280px);
    gap: 22px;
  }
  .music-releases__stage {
    height: clamp(310px, 84vw, 360px);
  }
  .music-releases__disc-wrap {
    transform:
      translate3d(calc(var(--off) * 58%), calc(var(--off) * -23%), calc(var(--abs) * -110px))
      rotateX(52deg) rotateZ(-14deg)
      scale(calc(1 - var(--abs) * .25));
  }
  .music-releases__stage::before,
  .music-releases__stage::after { inset: 14px; }
  .music-releases__title { max-width: 12ch; font-size: clamp(36px, 13vw, 54px); }
  .music-releases__track-name { font-size: 16px; }
  .music-releases__controls { grid-template-columns: 1fr 1fr; gap: 8px; }
  .music-releases__hint { display: none; }
  .music-releases__nav {
    justify-content: space-between;
    padding-inline: 10px;
    border-color: var(--line);
  }
}

/* ---------- reduced motion ---------- */
[data-motion-mode='static'] .music-releases__face,
[data-motion-mode='static'] .music-releases__disc-wrap,
[data-motion-mode='static'] .music-releases__nav,
[data-motion-mode='static'] .music-releases__track,
[data-motion-mode='static'] .music-releases__track::after,
[data-motion-mode='static'] .music-releases__disc-wrap::before,
[data-motion-mode='static'] .extras__soundcloud-link {
  animation: none;
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .music-releases__face { animation: none; }
  .music-releases__disc-wrap,
  .music-releases__nav,
  .music-releases__track,
  .music-releases__track::after,
  .music-releases__disc-wrap::before,
  .extras__soundcloud-link { transition: none; }
}
</style>
