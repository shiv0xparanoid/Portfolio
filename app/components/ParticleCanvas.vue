<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'

const emit = defineEmits<{
  (e: 'progress', value: number): void
  (e: 'ready'): void
}>()

type WorkerMessageType = 'init' | 'update' | 'resize' | 'particles'

interface WorkerMessage {
  type: WorkerMessageType
  positions?: ArrayBuffer
  colors?: ArrayBuffer
  count?: number
  width?: number
  height?: number
  delta?: number
  attractors?: Array<{ x: number; y: number; strength: number }>
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const particleCount = 2500

const state = reactive({
  positions: null as Float32Array | null,
  colors: null as Uint8Array | null,
  isReady: false
})

const mouse = reactive({
  x: 0,
  y: 0
})

let worker: Worker | null = null
let ctx: CanvasRenderingContext2D | null = null
let animationId: number | null = null
let lastTime = 0
let resizeObserver: ResizeObserver | null = null

// ============================================================================
// WASM MODE PLACEHOLDER
// ============================================================================
// When using the Rust particle-engine WASM module instead of Web Worker:
//
// import initWasm, { ParticleEngine } from '~/wasm/particle-engine/pkg/particle_engine.js'
//
// let wasmEngine: ParticleEngine | null = null
// let wasmMemory: WebAssembly.Memory | null = null
//
// async function initWasmMode() {
//   await initWasm()
//   wasmEngine = ParticleEngine.new(particleCount, window.innerWidth, window.innerHeight)
//   wasmMemory = (wasmEngine as any).memory
//   state.isReady = true
//   emit('progress', 100)
//   emit('ready')
// }
//
// function updateWasm(delta: number, attractors: Array<{ x: number; y: number; strength: number }>) {
//   if (!wasmEngine || !wasmMemory) return
//
//   wasmEngine.update(delta, attractors[0].x, attractors[0].y, attractors[0].strength)
//
//   const posPtr = wasmEngine.get_positions()
//   const colPtr = wasmEngine.get_colors()
//   const positions = new Float32Array(wasmMemory.buffer, posPtr, particleCount * 2)
//   const colors = new Uint8Array(wasmMemory.buffer, colPtr, particleCount * 3)
//
//   drawParticles(positions, colors)
// }
// ============================================================================

function drawParticles(positions: Float32Array, colors: Uint8Array) {
  if (!ctx || !canvasRef.value) return

  const { width, height } = canvasRef.value
  ctx.clearRect(0, 0, width, height)

  for (let i = 0; i < particleCount; i++) {
    const ix = i * 2
    const ic = i * 3

    const x = positions[ix]
    const y = positions[ix + 1]

    if (x < -10 || x > width + 10 || y < -10 || y > height + 10) continue

    const r = colors[ic]
    const g = colors[ic + 1]
    const b = colors[ic + 2]

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`
    ctx.fillRect(x, y, 2, 2)
  }
}

function onWorkerMessage(ev: MessageEvent<WorkerMessage>) {
  const msg = ev.data
  if (msg.type === 'particles' && msg.positions && msg.colors) {
    state.positions = new Float32Array(msg.positions)
    state.colors = new Uint8Array(msg.colors)
    drawParticles(state.positions, state.colors)
  }
}

function onMouseMove(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  mouse.x = e.clientX - rect.left
  mouse.y = e.clientY - rect.top
}

function postToWorker(msg: WorkerMessage, transfer?: Transferable[]) {
  if (worker) {
    worker.postMessage(msg, transfer ?? [])
  }
}

function resize() {
  if (!canvasRef.value) return

  const dpr = Math.min(window.devicePixelRatio, 2)
  const width = window.innerWidth
  const height = window.innerHeight

  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr
  canvasRef.value.style.width = `${width}px`
  canvasRef.value.style.height = `${height}px`

  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.scale(1, 1)
  }

  postToWorker({ type: 'resize', width, height })
}

function startRenderLoop() {
  const tick = (time: number) => {
    const delta = Math.min(0.05, (time - lastTime) / 1000 || 1 / 60)
    lastTime = time

    const attractors = [
      { x: mouse.x, y: mouse.y, strength: 800 }
    ]

    postToWorker({ type: 'update', delta, attractors })

    // For WASM mode use instead:
    // updateWasm(delta, attractors)

    animationId = requestAnimationFrame(tick)
  }

  lastTime = performance.now()
  animationId = requestAnimationFrame(tick)
}

function initWorker() {
  return new Promise<void>((resolve) => {
    emit('progress', 10)

    try {
      worker = new Worker('/workers/particle.worker.js', { type: 'classic' })
      worker.onmessage = onWorkerMessage

      emit('progress', 40)

      const width = window.innerWidth
      const height = window.innerHeight

      worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
        onWorkerMessage(ev)
        if (ev.data.type === 'particles') {
          state.isReady = true
          emit('progress', 100)
          emit('ready')
          resolve()
        }
      }

      postToWorker({ type: 'init', count: particleCount, width, height })

      setTimeout(() => {
        if (!state.isReady) {
          state.isReady = true
          emit('progress', 100)
          emit('ready')
          resolve()
        }
      }, 2000)
    } catch {
      state.isReady = true
      emit('progress', 100)
      emit('ready')
      resolve()
    }
  })
}

onMounted(async () => {
  if (!canvasRef.value) return

  const ctxResult = canvasRef.value.getContext('2d', { alpha: true })
  if (!ctxResult) return
  ctx = ctxResult

  resize()
  await initWorker()
  startRenderLoop()

  if (typeof ResizeObserver !== 'undefined' && canvasRef.value) {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvasRef.value)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', resize, { passive: true })
})

onBeforeUnmount(() => {
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (worker !== null) {
    worker.terminate()
    worker = null
  }
  if (resizeObserver !== null) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', resize)
  ctx = null
  state.positions = null
  state.colors = null
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
  overflow: hidden;
}
</style>
