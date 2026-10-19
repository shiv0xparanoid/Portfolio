<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { useThreeScene } from '~/composables/useThreeScene'
import { useDracoModels } from '~/composables/useDracoModels'

const emit = defineEmits<{
  (e: 'progress', value: number): void
  (e: 'models-loaded'): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const three = useThreeScene()
const draco = useDracoModels()

const shapes = ref<THREE.Mesh[]>([])
const isPaused = ref(false)
const animationId = ref<number | null>(null)

const mouse = reactive({
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0
})

function createGeometricShapes() {
  if (!three.scene.value) return

  const shapeConfigs = [
    { geo: () => new THREE.TorusKnotGeometry(6, 2, 128, 16), color: 0x6366f1, pos: new THREE.Vector3(-25, 10, -10) },
    { geo: () => new THREE.IcosahedronGeometry(7, 0), color: 0x8b5cf6, pos: new THREE.Vector3(25, -15, 5) },
    { geo: () => new THREE.OctahedronGeometry(8, 0), color: 0xa855f7, pos: new THREE.Vector3(0, 25, -20) },
    { geo: () => new THREE.TorusKnotGeometry(4, 1.2, 100, 12), color: 0xec4899, pos: new THREE.Vector3(-30, -20, 0) },
    { geo: () => new THREE.IcosahedronGeometry(5, 0), color: 0x22d3ee, pos: new THREE.Vector3(35, 5, -15) }
  ]

  shapeConfigs.forEach((config) => {
    const geometry = config.geo()
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      flatShading: true,
      wireframe: false,
      roughness: 0.4,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(config.pos)
    mesh.castShadow = true
    mesh.receiveShadow = true
    three.scene.value!.add(mesh)
    shapes.value.push(mesh)
  })
}

function onMouseMove(e: MouseEvent) {
  mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1
  mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1
}

function onVisibilityChange() {
  isPaused.value = document.hidden
  if (!isPaused.value && animationId.value === null) {
    startRenderLoop()
  }
}

function startRenderLoop() {
  if (!three.clock.value) return

  const tick = () => {
    if (isPaused.value) {
      animationId.value = null
      return
    }

    // Guard against clock becoming null
    if (!three.clock.value) {
      animationId.value = null
      return
    }

    const elapsed = three.clock.value.getElapsedTime()

    mouse.x += (mouse.targetX - mouse.x) * 0.02
    mouse.y += (mouse.targetY - mouse.y) * 0.02

    if (three.camera.value) {
      three.camera.value.position.x = mouse.x * 10
      three.camera.value.position.y = mouse.y * 6
      three.camera.value.lookAt(0, 0, 0)
    }

    shapes.value.forEach((mesh, i) => {
      const speed = 0.002 + (i % 3) * 0.001
      mesh.rotation.x += speed
      mesh.rotation.y += speed * 1.3
      mesh.position.y += Math.sin(elapsed * 0.5 + i) * 0.015
    })

    if (three.particleMaterial.value?.uniforms?.uTime) {
      three.particleMaterial.value.uniforms.uTime.value = elapsed
    }

    if (three.particleSystem.value) {
      three.particleSystem.value.rotation.y = elapsed * 0.02
      three.particleSystem.value.rotation.x = Math.sin(elapsed * 0.015) * 0.08
    }

    if (three.renderer.value && three.scene.value && three.camera.value) {
      three.renderer.value.render(three.scene.value, three.camera.value)
    }

    animationId.value = requestAnimationFrame(tick)
  }

  animationId.value = requestAnimationFrame(tick)
}

async function preloadPlaceholderModels() {
  const modelUrls: string[] = [
    // '/models/scene-hero.glb',
    // '/models/scene-portfolio.glb',
    // '/models/scene-footer.glb',
  ]

  if (modelUrls.length === 0) {
    emit('progress', 100)
    emit('models-loaded')
    return
  }

  try {
    await draco.preloadModels(modelUrls, (url, progress) => {
      emit('progress', draco.overallProgress.value)
    })
    emit('models-loaded')
  } catch {
    emit('progress', 100)
    emit('models-loaded')
  }
}

function onResize() {
  three.resize()
}

watch(draco.overallProgress, (val) => {
  emit('progress', val)
})

onMounted(() => {
  if (!containerRef.value) return

  three.init(containerRef.value)
  createGeometricShapes()
  startRenderLoop()
  preloadPlaceholderModels()

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  if (animationId.value !== null) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }

  shapes.value.forEach((mesh) => {
    mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose())
    } else {
      mesh.material.dispose()
    }
  })
  shapes.value = []

  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  document.removeEventListener('visibilitychange', onVisibilityChange)

  three.dispose()
  draco.clearModels()
})
</script>

<template>
  <div
    ref="containerRef"
    class="scene3d-container"
  />
</template>

<style scoped>
.scene3d-container {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.4;
  overflow: hidden;
}

.scene3d-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
</style>
