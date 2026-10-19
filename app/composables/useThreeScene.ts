import { ref, onUnmounted } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

import particleVertex from '~/shaders/particleVertex.glsl?raw'
import particleFragment from '~/shaders/particleFragment.glsl?raw'

export function useThreeScene() {
  const container = ref<HTMLElement | null>(null)
  const scene = ref<THREE.Scene | null>(null)
  const camera = ref<THREE.PerspectiveCamera | null>(null)
  const renderer = ref<THREE.WebGLRenderer | null>(null)
  const animationId = ref<number | null>(null)
  const particleSystem = ref<THREE.Points | null>(null)
  const particleMaterial = ref<THREE.ShaderMaterial | null>(null)
  const clock = ref<THREE.Clock | null>(null)

  const gltfLoader = ref<GLTFLoader | null>(null)
  const dracoLoader = ref<DRACOLoader | null>(null)

  const loadedModels = ref<Map<string, THREE.Group>>(new Map())

  function init(containerEl: HTMLElement) {
    container.value = containerEl

    scene.value = new THREE.Scene()
    scene.value.fog = new THREE.FogExp2(0x0a0a0f, 0.008)

    const width = containerEl.clientWidth
    const height = containerEl.clientHeight

    camera.value = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
    camera.value.position.set(0, 0, 80)

    renderer.value = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.value.setSize(width, height)
    renderer.value.setClearColor(0x000000, 0)
    renderer.value.outputColorSpace = THREE.SRGBColorSpace
    renderer.value.toneMapping = THREE.ACESFilmicToneMapping
    renderer.value.toneMappingExposure = 1.0
    containerEl.appendChild(renderer.value.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.value.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
    directionalLight.position.set(50, 80, 50)
    directionalLight.castShadow = true
    scene.value.add(directionalLight)

    dracoLoader.value = new DRACOLoader()
    dracoLoader.value.setDecoderPath('three/examples/jsm/libs/draco/')

    gltfLoader.value = new GLTFLoader()
    gltfLoader.value.setDRACOLoader(dracoLoader.value)

    clock.value = new THREE.Clock()

    initParticleSystem()
  }

  function initParticleSystem() {
    if (!scene.value) return

    const particleCount = 3000
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const scales = new Float32Array(particleCount)

    const colorPalette = [
      new THREE.Color(0x6366f1),
      new THREE.Color(0x8b5cf6),
      new THREE.Color(0xa855f7),
      new THREE.Color(0xec4899),
      new THREE.Color(0x22d3ee)
    ]

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const radius = 30 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi) - 20

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      scales[i] = Math.random() * 0.8 + 0.2
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))

    particleMaterial.value = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    particleSystem.value = new THREE.Points(geometry, particleMaterial.value)
    scene.value.add(particleSystem.value)
  }

  function resize() {
    if (!container.value || !camera.value || !renderer.value) return

    const width = container.value.clientWidth
    const height = container.value.clientHeight

    camera.value.aspect = width / height
    camera.value.updateProjectionMatrix()

    renderer.value.setSize(width, height)
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    if (particleMaterial.value?.uniforms?.uPixelRatio) {
      particleMaterial.value.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }
  }

  function animate(tick: number) {
    if (!clock.value) return

    const elapsedTime = clock.value.getElapsedTime()

    if (particleMaterial.value?.uniforms?.uTime) {
      particleMaterial.value.uniforms.uTime.value = elapsedTime
    }

    if (particleSystem.value) {
      particleSystem.value.rotation.y = elapsedTime * 0.03
      particleSystem.value.rotation.x = Math.sin(elapsedTime * 0.02) * 0.1
    }

    if (camera.value) {
      camera.value.position.x = Math.sin(elapsedTime * 0.05) * 5
      camera.value.position.y = Math.sin(elapsedTime * 0.03) * 3
      camera.value.lookAt(0, 0, 0)
    }

    if (renderer.value && scene.value && camera.value) {
      renderer.value.render(scene.value, camera.value)
    }

    animationId.value = requestAnimationFrame(() => animate(tick + 1))
  }

  async function loadModel(
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<THREE.Group> {
    if (!gltfLoader.value) {
      throw new Error('Scene not initialized. Call init() first.')
    }

    if (loadedModels.value.has(url)) {
      return loadedModels.value.get(url)!.clone() as THREE.Group
    }

    return new Promise((resolve, reject) => {
      gltfLoader.value!.load(
        url,
        (gltf) => {
          loadedModels.value.set(url, gltf.scene.clone() as THREE.Group)
          resolve(gltf.scene as THREE.Group)
        },
        (xhr) => {
          if (onProgress && xhr.total > 0) {
            onProgress((xhr.loaded / xhr.total) * 100)
          }
        },
        (error) => {
          reject(error)
        }
      )
    })
  }

  function addModel(model: THREE.Group, position?: THREE.Vector3) {
    if (!scene.value) return
    if (position) model.position.copy(position)
    scene.value.add(model)
  }

  function removeModel(model: THREE.Group) {
    if (!scene.value) return
    scene.value.remove(model)
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.geometry?.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose())
        } else {
          mesh.material?.dispose()
        }
      }
    })
  }

  function dispose() {
    if (animationId.value !== null) {
      cancelAnimationFrame(animationId.value)
      animationId.value = null
    }

    if (particleSystem.value) {
      particleSystem.value.geometry.dispose()
      if (particleMaterial.value) {
        particleMaterial.value.dispose()
      }
    }

    loadedModels.value.forEach((model) => {
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.geometry?.dispose()
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else {
            mesh.material?.dispose()
          }
        }
      })
    })
    loadedModels.value.clear()

    if (renderer.value) {
      renderer.value.dispose()
      if (renderer.value.domElement && container.value) {
        container.value.removeChild(renderer.value.domElement)
      }
      renderer.value = null
    }

    if (dracoLoader.value) {
      dracoLoader.value.dispose()
      dracoLoader.value = null
    }

    scene.value = null
    camera.value = null
    particleSystem.value = null
    particleMaterial.value = null
    clock.value = null
    gltfLoader.value = null
    container.value = null
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    scene,
    camera,
    renderer,
    clock,
    particleSystem,
    particleMaterial,
    loadedModels,
    init,
    resize,
    animate,
    loadModel,
    addModel,
    removeModel,
    dispose
  }
}
