<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

type PortraitState = { assemble: number; rotate: number }

const props = withDefaults(defineProps<{
  src?: string
  trigger?: string
  finalDeg?: number
  step?: number
  figureH?: number
  anchorX?: number // 0 = centre, 0.5 = centred in the right half of the screen
  fit?: number // how much of the screen height the figure may use (bigger = smaller figure)
  state?: PortraitState // when given, the parent timeline drives assemble/rotate
  debug?: boolean
}>(), { src: '/portrait-body.png', trigger: '#ch1', finalDeg: 90, step: 3, figureH: 6.2, anchorX: 0.5, fit: 1.2, debug: false })

const host = ref<HTMLDivElement>()
const msg = ref('')
let cleanup = () => {}
const fail = (m: string) => { msg.value = m; console.error('[ParticlePortrait]', m) }

onMounted(() => {
  gsap.registerPlugin(ScrollTrigger)
  const el = host.value!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const st: PortraitState = props.state ?? { assemble: reduce ? 1 : 0, rotate: 0 }

  // ---------- renderer ----------
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) }
  catch (e) { fail('WebGL could not start: ' + (e as Error).message); return }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new (RoomEnvironment as any)(renderer), 0.04).texture
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  camera.position.set(0, 0, 14)
  const group = new THREE.Group()
  scene.add(group)
  let halfW = 6, halfH = 3.3 // half size of the visible world at z = 0 (updated on resize)

  // ---------- soft bokeh layer: covers the whole screen, fades as the portrait assembles ----------
  const sp = document.createElement('canvas'); sp.width = sp.height = 64
  const sx = sp.getContext('2d')!
  const g = sx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.6, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  sx.fillStyle = g; sx.fillRect(0, 0, 64, 64)
  const NB = 900, bp = new Float32Array(NB * 3), bc = new Float32Array(NB * 3)
  for (let i = 0; i < NB; i++) {
    bp[i*3] = Math.random() * 2 - 1 // -1..1, scaled to the screen in resize()
    bp[i*3+1] = Math.random() * 2 - 1
    bp[i*3+2] = (Math.random() - .5) * 3
    const c = new THREE.Color().setHSL(.07, .35, .3 + Math.random() * .2)
    bc.set([c.r, c.g, c.b], i*3)
  }
  const bgeo = new THREE.BufferGeometry()
  bgeo.setAttribute('position', new THREE.BufferAttribute(bp, 3))
  bgeo.setAttribute('color', new THREE.BufferAttribute(bc, 3))
  const bmat = new THREE.PointsMaterial({ size: .55, map: new THREE.CanvasTexture(sp), vertexColors: true, transparent: true, depthWrite: false, opacity: .8 })
  const bokeh = new THREE.Points(bgeo, bmat)
  bokeh.frustumCulled = false
  scene.add(bokeh)

  // ---------- portrait particles ----------
  let mesh: THREE.InstancedMesh | null = null
  let N = 0
  let hx!: Float32Array, hy!: Float32Array, hz!: Float32Array, cx!: Float32Array, cy!: Float32Array, cz!: Float32Array
  let sz!: Float32Array, dl!: Float32Array, ph!: Float32Array
  let ox!: Float32Array, oy!: Float32Array, vx!: Float32Array, vy!: Float32Array

  const img = new Image()
  img.onerror = () => fail('Image not found: ' + props.src + '  (put the PNG inside /public and check the name)')
  img.onload = () => {
    try {
      const iw = img.naturalWidth, ih = img.naturalHeight
      const oc = document.createElement('canvas'); oc.width = iw; oc.height = ih
      const o = oc.getContext('2d')!; o.drawImage(img, 0, 0)
      const d = o.getImageData(0, 0, iw, ih).data
      const step = innerWidth < 700 ? props.step + 1 : props.step
      const cols = Math.floor(iw / step), rows = Math.floor(ih / step)
      const cell = props.figureH / rows
      const pts: { c: number; r: number; col: THREE.Color }[] = []
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = (((r*step + 1) * iw) + (c*step + 1)) * 4
        if (d[k+3] < 128) continue
        pts.push({ c, r, col: new THREE.Color().setRGB(d[k]/255, d[k+1]/255, d[k+2]/255, THREE.SRGBColorSpace) })
      }
      if (!pts.length) { fail('0 particles: the PNG has no opaque pixels (it needs a transparent-background cut-out)'); return }

      // per-row width -> fake body depth (ellipse cross-section)
      const mn: number[] = Array(rows).fill(1e9), mx: number[] = Array(rows).fill(-1)
      pts.forEach(p => { mn[p.r] = Math.min(mn[p.r], p.c); mx[p.r] = Math.max(mx[p.r], p.c) })
      const rc: number[] = [], hw: number[] = []
      for (let i = 0; i < rows; i++) {
        let a = 0, b = 0, n = 0
        for (let j = Math.max(0, i-8); j <= Math.min(rows-1, i+8); j++) if (mx[j] >= 0) { a += (mn[j]+mx[j])/2; b += (mx[j]-mn[j])/2; n++ }
        rc[i] = n ? a/n : cols/2; hw[i] = n ? Math.max(3, b/n + 1) : 3
      }

      N = pts.length
      ;[hx, hy, hz, cx, cy, cz, sz, dl, ph, ox, oy, vx, vy] = Array.from({ length: 13 }, () => new Float32Array(N))
      const geo = new THREE.IcosahedronGeometry(.5, innerWidth < 700 ? 0 : 1)
      const mat = new THREE.MeshStandardMaterial({ roughness: .45, metalness: .15 })
      mesh = new THREE.InstancedMesh(geo, mat, N)
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      pts.forEach((p, i) => {
        hx[i] = (p.c + .5 - cols/2) * cell + (Math.random()-.5) * cell * .8
        hy[i] = -(p.r + .5 - rows/2) * cell + (Math.random()-.5) * cell * .8
        const u = (p.c - rc[p.r]) / hw[p.r], q = Math.max(0, 1 - u*u)
        hz[i] = hw[p.r] * cell * (p.r/rows < .17 ? 1 : .6) * Math.sqrt(q) - cols*cell*.06
        cx[i] = (Math.random()+Math.random()+Math.random()-1.5) * .75 // about -1.1..1.1 of half screen width
        cy[i] = (Math.random() - .5) * 2.2
        cz[i] = (Math.random() - .5) * 3
        sz[i] = cell * (.8 + Math.random()*.6)
        dl[i] = Math.random()*.6 + (p.r/rows)*.4
        ph[i] = Math.random() * 6.28
        mesh!.setColorAt(i, p.col)
      })
      group.add(mesh)
      if (props.debug) console.log('[ParticlePortrait] particles:', N, 'image:', iw + 'x' + ih, 'grid:', cols + 'x' + rows)
    } catch (e) { fail('Could not build particles: ' + (e as Error).message) }
  }
  img.src = props.src

  // ---------- mouse -> local space, spring repel ----------
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const ndc = new THREE.Vector2(9, 9), hit = new THREE.Vector3(), local = new THREE.Vector3()
  let mouseOn = false
  const onMove = (e: PointerEvent) => {
    const b = renderer.domElement.getBoundingClientRect()
    ndc.set(((e.clientX-b.left)/b.width)*2-1, -((e.clientY-b.top)/b.height)*2+1)
    mouseOn = ndc.x > -1 && ndc.x < 1 && ndc.y > -1 && ndc.y < 1
  }
  const onLeave = () => { mouseOn = false }
  addEventListener('pointermove', onMove); addEventListener('pointerleave', onLeave)

  // ---------- resize ----------
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight
    if (!w || !h) { if (!msg.value) fail('Container size is 0 (' + w + 'x' + h + '). The parent needs position:relative and a height.'); return }
    if (msg.value.startsWith('Container size')) msg.value = ''
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const t = Math.tan((camera.fov * Math.PI / 180) / 2)
    camera.position.z = Math.max((props.figureH * props.fit / 2) / t, (props.figureH * .62 / camera.aspect / 2) / t)
    camera.updateProjectionMatrix()
    halfH = t * camera.position.z
    halfW = halfH * camera.aspect
    const ax = innerWidth < 980 ? 0 : props.anchorX
    group.position.set(halfW * ax, -halfH * .03, 0)
    bokeh.scale.set(halfW, halfH, 1)
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize()

  // ---------- render loop ----------
  const dummy = new THREE.Object3D()
  const smooth = (x: number) => x*x*(3-2*x)
  const tick = (t: number) => {
    const A = st.assemble
    group.rotation.y = st.rotate * props.finalDeg * Math.PI / 180
    bmat.opacity = .8 * (1 - A); bokeh.visible = A < .99
    bokeh.rotation.z = Math.sin(t * .1) * .02

    if (mesh) {
      if (!reduce && mouseOn) {
        ray.setFromCamera(ndc, camera)
        if (ray.ray.intersectPlane(plane, hit)) { local.copy(hit); group.worldToLocal(local) }
      } else local.set(999, 999, 0)
      const gx = group.position.x, gy = group.position.y
      for (let i = 0; i < N; i++) {
        const u = Math.min(1, Math.max(0, (A - dl[i]*.6) / .4)), e = smooth(u)
        const amp = reduce ? 0 : (1 - e) * .25
        const startX = cx[i] * halfW - gx, startY = cy[i] * halfH - gy
        let x = startX + (hx[i]-startX)*e + Math.sin(t*.5 + ph[i]) * amp
        let y = startY + (hy[i]-startY)*e + Math.cos(t*.4 + ph[i]*1.3) * amp
        const z = cz[i] + (hz[i]-cz[i])*e
        if (!reduce) {
          const dx = x - local.x, dy = y - local.y, d2 = dx*dx + dy*dy
          if (d2 < .55) { const dd = Math.sqrt(d2) + .001, f = (1 - dd/.74), k = f*f*.03; vx[i] += dx/dd*k; vy[i] += dy/dd*k }
          vx[i] -= ox[i]*.05; vy[i] -= oy[i]*.05; vx[i] *= .86; vy[i] *= .86
          ox[i] += vx[i]; oy[i] += vy[i]; x += ox[i]; y += oy[i]
        }
        dummy.position.set(x, y, z)
        dummy.scale.setScalar(Math.max(sz[i] * e, .00001))
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    renderer.render(scene, camera)
  }
  gsap.ticker.add(tick)

  // ---------- standalone story (only if the parent does NOT drive the state) ----------
  let rot: gsap.core.Tween | undefined
  if (!props.state) {
    if (!reduce) gsap.to(st, { assemble: 1, duration: 3.2, delay: .3, ease: 'power2.inOut' })
    rot = gsap.to(st, { rotate: 1, ease: 'none', scrollTrigger: { trigger: props.trigger, start: 'top top', end: 'bottom top', scrub: .8 } })
  }

  cleanup = () => {
    gsap.ticker.remove(tick); rot?.scrollTrigger?.kill(); rot?.kill(); ro.disconnect()
    removeEventListener('pointermove', onMove); removeEventListener('pointerleave', onLeave)
    mesh?.geometry.dispose(); (mesh?.material as THREE.Material | undefined)?.dispose()
    bgeo.dispose(); bmat.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove()
  }
})
onBeforeUnmount(() => cleanup())
</script>

<template>
  <div ref="host" class="particle-portrait">
    <p v-if="msg" class="pp-msg">{{ msg }}</p>
  </div>
</template>

<style scoped>
.particle-portrait { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.particle-portrait :deep(canvas) { display: block; width: 100%; height: 100%; }
.pp-msg { position: absolute; left: 0; right: 0; bottom: 12px; margin: 0; padding: 8px 16px; text-align: center; font: 12px/1.5 ui-monospace, monospace; color: #b3361f; background: rgba(255,255,255,.7); }
</style>