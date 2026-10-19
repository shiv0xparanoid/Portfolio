import { ref, computed } from 'vue'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import type { Group } from 'three'

export function useDracoModels() {
  const models = ref<Map<string, Group>>(new Map())
  const isLoading = ref(false)
  const overallProgress = ref(0)
  const individualProgress = ref<Map<string, number>>(new Map())
  const error = ref<Error | null>(null)

  let gltfLoader: GLTFLoader | null = null
  let dracoLoader: DRACOLoader | null = null

  function ensureLoaders() {
    if (!gltfLoader || !dracoLoader) {
      dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/')

      gltfLoader = new GLTFLoader()
      gltfLoader.setDRACOLoader(dracoLoader)
    }
  }

  async function loadModel(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<Group> {
    ensureLoaders()

    if (models.value.has(url)) {
      const cached = models.value.get(url)!
      onProgress?.(100)
      individualProgress.value.set(url, 100)
      return cached.clone() as Group
    }

    individualProgress.value.set(url, 0)

    return new Promise((resolve, reject) => {
      gltfLoader!.load(
        url,
        (gltf) => {
          const scene = gltf.scene as Group
          models.value.set(url, scene.clone() as Group)
          individualProgress.value.set(url, 100)
          onProgress?.(100)
          resolve(scene)
        },
        (xhr) => {
          if (xhr.total > 0) {
            const progress = (xhr.loaded / xhr.total) * 100
            individualProgress.value.set(url, progress)
            onProgress?.(progress)
          }
        },
        (err) => {
          error.value = err instanceof Error ? err : new Error(String(err))
          reject(err)
        }
      )
    })
  }

  async function preloadModels(
    urls: string[],
    onModelProgress?: (url: string, progress: number) => void
  ): Promise<Map<string, Group>> {
    isLoading.value = true
    overallProgress.value = 0
    error.value = null

    const totalModels = urls.length
    let completedModels = 0

    urls.forEach((url) => {
      individualProgress.value.set(url, 0)
    })

    const updateOverallProgress = () => {
      let totalProgress = 0
      individualProgress.value.forEach((progress) => {
        totalProgress += progress
      })
      overallProgress.value = totalProgress / totalModels
    }

    const loadPromises = urls.map(async (url) => {
      try {
        const model = await loadModel(url, (progress) => {
          onModelProgress?.(url, progress)
          updateOverallProgress()
        })
        completedModels++
        updateOverallProgress()
        return { url, model }
      } catch (err) {
        completedModels++
        updateOverallProgress()
        throw err
      }
    })

    try {
      const results = await Promise.all(loadPromises)
      const resultMap = new Map<string, Group>()
      results.forEach(({ url, model }) => {
        resultMap.set(url, model)
      })
      overallProgress.value = 100
      isLoading.value = false
      return resultMap
    } catch (err) {
      isLoading.value = false
      error.value = err instanceof Error ? err : new Error(String(err))
      throw err
    }
  }

  function getModel(url: string): Group | null {
    const model = models.value.get(url)
    return model ? (model.clone() as Group) : null
  }

  function hasModel(url: string): boolean {
    return models.value.has(url)
  }

  function clearModels() {
    models.value.forEach((model) => {
      model.traverse((child) => {
        if ((child as any).isMesh) {
          const mesh = child as any
          mesh.geometry?.dispose?.()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m: any) => m.dispose?.())
          } else {
            mesh.material?.dispose?.()
          }
        }
      })
    })
    models.value.clear()
    individualProgress.value.clear()
    overallProgress.value = 0
  }

  const loadedCount = computed(() => models.value.size)

  return {
    models,
    isLoading,
    overallProgress,
    individualProgress,
    error,
    loadedCount,
    loadModel,
    preloadModels,
    getModel,
    hasModel,
    clearModels
  }
}
