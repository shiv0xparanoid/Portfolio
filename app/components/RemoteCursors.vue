<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useSharedCursor, type RemoteCursor } from '~/composables/useSharedCursor'

interface RenderedCursor {
  id: string
  renderX: number
  renderY: number
  targetX: number
  targetY: number
  color: string
  label: string
}

const { remoteCursors, startTracking, disconnect } = useSharedCursor()

const renderedCursors = reactive<Map<string, RenderedCursor>>(new Map())
const animationId = ref<number | null>(null)
const CURSOR_TIMEOUT = 15000

function hashPeerId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateColor(id: string): string {
  const hash = hashPeerId(id)
  const hue = hash % 360
  const saturation = 70 + (hash % 20)
  const lightness = 55 + (hash % 15)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

function generateLabel(id: string): string {
  const hash = hashPeerId(id)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const numbers = '23456789'
  const first = letters[hash % letters.length]
  const second = numbers[Math.floor(hash / letters.length) % numbers.length]
  const third = letters[Math.floor(hash / (letters.length * numbers.length)) % letters.length]
  return `${first}${second}${third}`
}

function syncCursors() {
  const now = Date.now()

  remoteCursors.forEach((cursor: RemoteCursor) => {
    if (now - cursor.lastSeen > CURSOR_TIMEOUT) {
      renderedCursors.delete(cursor.id)
      return
    }

    const existing = renderedCursors.get(cursor.id)
    if (existing) {
      existing.targetX = cursor.x
      existing.targetY = cursor.y
    } else {
      renderedCursors.set(cursor.id, {
        id: cursor.id,
        renderX: cursor.x,
        renderY: cursor.y,
        targetX: cursor.x,
        targetY: cursor.y,
        color: generateColor(cursor.id),
        label: generateLabel(cursor.id)
      })
    }
  })

  renderedCursors.forEach((rc) => {
    if (!remoteCursors.has(rc.id)) {
      renderedCursors.delete(rc.id)
    }
  })
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function startLerpLoop() {
  const tick = () => {
    syncCursors()

    renderedCursors.forEach((rc) => {
      rc.renderX = lerp(rc.renderX, rc.targetX, 0.18)
      rc.renderY = lerp(rc.renderY, rc.targetY, 0.18)
    })

    animationId.value = requestAnimationFrame(tick)
  }

  animationId.value = requestAnimationFrame(tick)
}

const cursorList = computed(() => {
  return Array.from(renderedCursors.values())
})

watch(remoteCursors, () => {
  syncCursors()
}, { deep: true })

onMounted(() => {
  startTracking()
  startLerpLoop()
})

onBeforeUnmount(() => {
  if (animationId.value !== null) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
  disconnect()
  renderedCursors.clear()
})
</script>

<template>
  <div class="remote-cursors-layer">
    <div
      v-for="cursor in cursorList"
      :key="cursor.id"
      class="remote-cursor"
      :style="{
        transform: `translate(${cursor.renderX}px, ${cursor.renderY}px)`
      }"
    >
      <svg
        class="remote-cursor-dot"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 4 L14 4 L10 10 L16 10 L10 22 L12 14 L6 14 Z"
          :fill="cursor.color"
          stroke="rgba(255,255,255,0.9)"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
      <span
        class="remote-cursor-label"
        :style="{ backgroundColor: cursor.color }"
      >
        {{ cursor.label }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.remote-cursors-layer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9998;
  pointer-events: none;
  opacity: 0.7;
  overflow: hidden;
}

.remote-cursor {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  transform-origin: 0 0;
  pointer-events: none;
}

.remote-cursor-dot {
  display: block;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
}

.remote-cursor-label {
  position: absolute;
  top: 22px;
  left: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 20px;
  padding: 0 7px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: rgba(0, 0, 0, 0.85);
  border-radius: 999px;
  white-space: nowrap;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
}
</style>
