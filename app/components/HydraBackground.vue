<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useHydra, type HydraPreset } from '~/composables/useHydra'
import { useLenisSmooth } from '~/composables/useLenisSmooth'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isVisible = ref(true)
const currentPresetIndex = ref(0)

const hydra = useHydra()
const lenis = useLenisSmooth()

const presets: HydraPreset[] = ['noise', 'voronoi', 'oscillator', 'gradient']
let presetTimer: ReturnType<typeof setInterval> | null = null
let resizeObserver: ResizeObserver | null = null

const currentPresetLabel = computed(() => {
  const labels: Record<HydraPreset, string> = {
    noise: 'Noise',
    voronoi: 'Voronoi',
    oscillator: 'Oscillator',
    gradient: 'Gradient'
  }
  return labels[hydra.currentPreset.value]
})

function cyclePreset() {
  currentPresetIndex.value = (currentPresetIndex.value + 1) % presets.length
  hydra.setPreset(presets[currentPresetIndex.value])
}

function applyScrollDistortion() {
  const distortion = Math.min(1, lenis.scrollProgress.value * 1.5)
  hydra.updateAudio(distortion)
}

function onResize() {
  if (!canvasRef.value || !hydra.instance.value) return

  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, 2)

  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr
  canvasRef.value.style.width = `${width}px`
  canvasRef.value.style.height = `${height}px`

  hydra.instance.value.setResolution(width * dpr, height * dpr)
}

function toggleVisibility() {
  isVisible.value = !isVisible.value
}

watch(lenis.scrollProgress, () => {
  applyScrollDistortion()
})

watch(isVisible, (val) => {
  if (val && canvasRef.value && !hydra.isInitialized.value) {
    hydra.init(canvasRef.value)
  }
})

onMounted(() => {
  if (canvasRef.value && isVisible.value) {
    hydra.init(canvasRef.value)
  }

  applyScrollDistortion()

  presetTimer = setInterval(cyclePreset, 8000)

  if (typeof ResizeObserver !== 'undefined' && canvasRef.value) {
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvasRef.value)
  }

  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  if (presetTimer !== null) {
    clearInterval(presetTimer)
    presetTimer = null
  }
  if (resizeObserver !== null) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', onResize)
  hydra.destroy()
})
</script>

<template>
  <div class="hydra-wrapper">
    <canvas
      ref="canvasRef"
      class="hydra-canvas"
      :style="{ opacity: isVisible ? 0.15 : 0 }"
    />

    <button
      type="button"
      class="hydra-debug"
      @click="toggleVisibility"
    >
      <span class="hydra-dot" :class="{ on: isVisible }" />
      Hydra [{{ isVisible ? 'ON' : 'OFF' }}]
      <span class="hydra-preset" v-if="isVisible">{{ currentPresetLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.hydra-wrapper {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
}

.hydra-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  mix-blend-mode: multiply;
  transition: opacity 600ms ease;
  will-change: opacity;
}

.hydra-debug {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 9999;
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  cursor: pointer;
  transition: all 200ms ease;
  user-select: none;
}

.hydra-debug:hover {
  background: rgba(10, 10, 15, 0.85);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.hydra-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4b5563;
  transition: background 200ms ease, box-shadow 200ms ease;
}

.hydra-dot.on {
  background: #22d3ee;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.6);
}

.hydra-preset {
  padding-left: 8px;
  margin-left: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.5);
}
</style>
