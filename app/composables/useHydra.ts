import { ref, onBeforeUnmount } from 'vue'

type HydraPreset = 'noise' | 'voronoi' | 'oscillator' | 'gradient'

export interface HydraInstance {
  synth: any
  canvas: HTMLCanvasElement | null
  setResolution: (width: number, height: number) => void
}

export function useHydra() {
  const instance = ref<HydraInstance | null>(null)
  const currentPreset = ref<HydraPreset>('noise')
  const audioLevel = ref(0)
  const isInitialized = ref(false)

  let animationFrame: number | null = null
  let timeParam = 0

  const runPreset = (preset: HydraPreset, audio: number) => {
    const hydra = instance.value
    if (!hydra?.synth) return

    const { synth } = hydra
    const t = timeParam
    const a = audio

    try {
      if (typeof synth.hush === 'function') {
        synth.hush()
      }

      switch (preset) {
        case 'noise': {
          synth
            .noise(2 + a * 5, 0.1 + t * 0.001, 0.1)
            .out(synth.o0)
          break
        }
        case 'voronoi': {
          synth
            .voronoi(5 + a * 15, 0.2 + t * 0.0003, a * 0.5)
            .color(0.3 + a * 0.5, 0.1, 0.6)
            .out(synth.o0)
          break
        }
        case 'oscillator': {
          synth
            .osc(10 + a * 20, 0.1, 1.5)
            .kaleid(4)
            .out(synth.o0)
          break
        }
        case 'gradient': {
          synth
            .gradient(3)
            .luma(0.2 + a * 0.3, 0.1)
            .out(synth.o0)
          break
        }
      }
    } catch {
      // noop
    }
  }

  const tick = () => {
    timeParam += 1
    if (instance.value?.synth?.tick) {
      try {
        instance.value.synth.tick()
      } catch {
        // noop
      }
    }
    animationFrame = requestAnimationFrame(tick)
  }

  const init = (canvas: HTMLCanvasElement) => {
    if (typeof window === 'undefined') return
    if (instance.value) return

    import('hydra-synth').then(({ default: Hydra }) => {
      const width = canvas.clientWidth || window.innerWidth
      const height = canvas.clientHeight || window.innerHeight

      const hydraInst = new (Hydra as any)({
        canvas,
        width,
        height,
        makeGlobal: false,
        detectAudio: false,
      })
      const synth = hydraInst.synth

      instance.value = {
        synth,
        canvas,
        setResolution: (w: number, h: number) => {
          if (typeof synth.setResolution === 'function') {
            synth.setResolution(w, h)
          }
        },
      }

      canvas.width = width
      canvas.height = height

      runPreset(currentPreset.value, audioLevel.value)
      tick()
      isInitialized.value = true
    }).catch(() => {
      // silent hydra load fail
    })
  }

  const setPreset = (preset: HydraPreset) => {
    currentPreset.value = preset
    runPreset(preset, audioLevel.value)
  }

  const updateAudio = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value))
    audioLevel.value = clamped
    runPreset(currentPreset.value, clamped)
  }

  const destroy = () => {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    if (instance.value?.synth?.hush) {
      try {
        instance.value.synth.hush()
      } catch {
        // noop
      }
    }
    instance.value = null
    isInitialized.value = false
  }

  onBeforeUnmount(() => destroy())

  return {
    instance,
    currentPreset,
    audioLevel,
    isInitialized,
    init,
    setPreset,
    updateAudio,
    destroy,
  }
}
