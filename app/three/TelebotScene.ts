import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ScreenReel, type ScreenMediaItem, type ScreenProject } from './ScreenReel'
import type { TelebotState } from '~/composables/useTelebot'

export type TelebotQuality = 'low' | 'high'

export interface TelebotSceneOptions {
  canvas: HTMLCanvasElement
  media?: ScreenMediaItem[]
  name?: string
  role?: string
  projects?: ScreenProject[]
  quality?: TelebotQuality
  onMediaChange?: (item: ScreenMediaItem | null, index: number) => void
  onCaption?: (caption: string) => void
  onInvalidate?: () => void
}

export interface TelebotSceneController {
  readonly reel: ScreenReel
  resize(width: number, height: number): void
  setQuality(quality: TelebotQuality): void
  setActive(active: boolean, motionAllowed?: boolean): void
  setPointer(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number }
  next(): void
  render(time: number, state: Readonly<TelebotState>, reducedMotion: boolean): void
  renderStatic(state: Readonly<TelebotState>, reducedMotion: boolean): void
  dispose(): void
}

function roundedShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  const r = Math.min(radius, width / 2, height / 2)
  shape.moveTo(x + r, y)
  shape.lineTo(x + width - r, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + r)
  shape.lineTo(x + width, y + height - r)
  shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  shape.lineTo(x + r, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  shape.closePath()
  return shape
}

function slab(width: number, height: number, depth: number, radius: number, bevel: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  })
  geometry.translate(0, 0, -depth / 2)
  return new THREE.Mesh(geometry, material)
}

const CRT_TAPER = .3

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function taperAt(z: number): number {
  return 1 - CRT_TAPER * clamp01((.1 - z) / .95)
}

function taperedRoundedBox(width: number, height: number, depth: number, radius: number, bevel: number): THREE.ExtrudeGeometry {
  const innerDepth = depth - 2 * bevel
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width - 2 * bevel, height - 2 * bevel, radius), {
    depth: innerDepth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 5,
    curveSegments: 14,
  })
  geometry.translate(0, 0, -innerDepth / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const scale = taperAt(position.getZ(i))
    position.setX(i, position.getX(i) * scale)
    position.setY(i, position.getY(i) * scale)
  }
  geometry.computeVertexNormals()
  return geometry
}

function cable(points: THREE.Vector3[], material: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', .45)
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 72, .085, 12, false), material)
}

function knitTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#bbb6b1'
  ctx.fillRect(0, 0, 160, 160)
  for (let y = -8; y < 168; y += 16) {
    for (let x = -8; x < 168; x += 16) {
      ctx.strokeStyle = '#8f8987'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(x + 1, y + 2)
      ctx.lineTo(x + 8, y + 14)
      ctx.lineTo(x + 15, y + 2)
      ctx.stroke()
      ctx.strokeStyle = '#e4dfd8'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(x + 4, y + 2)
      ctx.lineTo(x + 8, y + 10)
      ctx.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(8, 6)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const renderable = child as THREE.Mesh | THREE.Line
    if (!renderable.isMesh && !renderable.isLine) return
    renderable.geometry?.dispose()
    const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && typeof value === 'object' && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose()
      })
      material.dispose()
    })
  })
}

function makeHarness(meshParent: THREE.Group, fabric: THREE.Material, metal: THREE.Material): void {
  const left = new THREE.Mesh(new THREE.BoxGeometry(.16, 2.05, .18), fabric)
  left.position.set(-.9, -1.75, 1.03)
  left.rotation.z = -.12
  meshParent.add(left)
  const right = left.clone()
  right.position.x = .9
  right.rotation.z = .12
  meshParent.add(right)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.9, .14, .2), fabric)
  chest.position.set(0, -2.02, 1.05)
  meshParent.add(chest)
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(.3, .34, .08), metal)
  buckle.position.set(0, -2.02, 1.18)
  meshParent.add(buckle)
  const cross = new THREE.Mesh(new THREE.BoxGeometry(.16, .42, .1), metal)
  cross.position.set(0, -2.02, 1.24)
  meshParent.add(cross)
}

function buildEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.WebGLRenderTarget {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const renderTarget = pmrem.fromScene(room, .035)
  scene.environment = renderTarget.texture
  // RoomEnvironment is a generated scene, not part of our visible scene.
  room.dispose()
  pmrem.dispose()
  // Keep the render target alive for as long as scene.environment uses its
  // texture. It is released with the scene instead of during setup.
  return renderTarget
}

function makePort(material: THREE.Material, ringMaterial: THREE.Material): THREE.Group {
  const port = new THREE.Group()
  port.add(new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .08, 18), ringMaterial))
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(.095, .095, .14, 18), material)
  collar.rotation.x = Math.PI / 2
  collar.position.z = -.06
  port.add(collar)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 7, 24), ringMaterial)
  ring.rotation.x = Math.PI / 2
  ring.position.z = -.15
  port.add(ring)
  return port
}

interface ChapterArtifacts {
  group: THREE.Group
  research: THREE.Group
  impact: THREE.Group
  caseFile: THREE.Group
}

function makeChapterArtifacts(blue: THREE.Material, warm: THREE.Material, dark: THREE.Material): ChapterArtifacts {
  const group = new THREE.Group()
  group.name = 'telebot-chapter-artifacts'
  group.position.set(2.05, -1.22, -.35)
  group.scale.setScalar(.52)

  // These are deliberately abstract, source-free study marks. Their shape is
  // decorative chapter context rather than a claim about research or impact.
  const research = new THREE.Group()
  research.name = 'research-graph'
  const nodeGeometry = new THREE.SphereGeometry(.075, 10, 8)
  const nodeMaterial = blue.clone()
  nodeMaterial.transparent = true
  nodeMaterial.opacity = .78
  const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, 6)
  const nodePositions = [
    new THREE.Vector3(-.45, .05, 0), new THREE.Vector3(-.12, .34, 0),
    new THREE.Vector3(.2, .06, 0), new THREE.Vector3(.48, .38, 0),
    new THREE.Vector3(.42, -.27, 0), new THREE.Vector3(-.18, -.3, 0),
  ]
  const nodeMatrix = new THREE.Matrix4()
  nodePositions.forEach((position, index) => {
    nodeMatrix.makeTranslation(position.x, position.y, position.z)
    nodes.setMatrixAt(index, nodeMatrix)
  })
  nodes.instanceMatrix.needsUpdate = true
  research.add(nodes)
  const graphLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      nodePositions[0]!, nodePositions[1]!, nodePositions[1]!, nodePositions[2]!,
      nodePositions[2]!, nodePositions[3]!, nodePositions[2]!, nodePositions[4]!,
      nodePositions[0]!, nodePositions[5]!, nodePositions[5]!, nodePositions[2]!,
    ]),
    new THREE.LineBasicMaterial({ color: 0x7fe6df, transparent: true, opacity: .48 }),
  )
  research.add(graphLines)

  const impact = new THREE.Group()
  impact.name = 'impact-bars'
  const barGeometry = new THREE.BoxGeometry(.14, 1, .12)
  const barMaterial = warm.clone()
  barMaterial.transparent = true
  barMaterial.opacity = .7
  const bars = new THREE.InstancedMesh(barGeometry, barMaterial, 5)
  const barHeights = [.34, .58, .44, .76, .52]
  barHeights.forEach((height, index) => {
    nodeMatrix.makeScale(1, height, 1)
    nodeMatrix.setPosition(-.38 + index * .19, height / 2 - .3, 0)
    bars.setMatrixAt(index, nodeMatrix)
  })
  bars.instanceMatrix.needsUpdate = true
  impact.add(bars)

  const caseFile = new THREE.Group()
  caseFile.name = 'case-file'
  const fileMaterial = dark.clone()
  fileMaterial.transparent = true
  fileMaterial.opacity = .7
  const file = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, .76, .08)), new THREE.LineBasicMaterial({ color: 0xffbf73, transparent: true, opacity: .72 }))
  file.position.y = .02
  caseFile.add(file)
  const tab = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, .04), fileMaterial)
  tab.position.set(-.26, .43, 0)
  caseFile.add(tab)

  group.add(research, impact, caseFile)
  return { group, research, impact, caseFile }
}

export function createTelebotScene(options: TelebotSceneOptions): TelebotSceneController {
  const { canvas } = options
  const quality = options.quality || 'high'
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: quality === 'high',
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  // The WebGL layer stays transparent; the component supplies the light-grey
  // studio treatment so the CRT can sit naturally on either page background.
  scene.background = null
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 100)
  camera.position.set(0, -.3, 9.2)
  camera.lookAt(0, -.55, 0)
  const root = new THREE.Group()
  root.position.y = 0
  scene.add(root)

  const environment = buildEnvironment(renderer, scene)
  scene.add(new THREE.HemisphereLight(0xd7dde5, 0x3d4147, 1.15))
  const key = new THREE.DirectionalLight(0xe5e9ee, 2.2)
  key.position.set(-4.5, 6, 6)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -5
  key.shadow.camera.right = 5
  key.shadow.camera.top = 5
  key.shadow.camera.bottom = -5
  key.shadow.camera.near = .5
  key.shadow.camera.far = 20
  key.shadow.bias = -.0004
  key.shadow.radius = 5
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xa9b7c9, .8)
  fill.position.set(4, 1.5, 5)
  scene.add(fill)
  const rim = new THREE.PointLight(0x85a9ff, 1.4, 13)
  rim.position.set(-3.8, 1.4, -3.2)
  scene.add(rim)

  const reel = new ScreenReel({
    media: options.media,
    name: options.name,
    role: options.role,
    projects: options.projects,
    onMediaChange: options.onMediaChange,
    onCaption: options.onCaption,
    onInvalidate: options.onInvalidate,
  })

  const caseMaterial = new THREE.MeshPhysicalMaterial({ color: 0xd8d0c5, roughness: .35, metalness: .08, clearcoat: .55, clearcoatRoughness: .24 })
  const caseShadow = new THREE.MeshPhysicalMaterial({ color: 0xaaa39c, roughness: .42, metalness: .12, clearcoat: .35 })
  const bezelMaterial = new THREE.MeshStandardMaterial({ color: 0x272b30, roughness: .28, metalness: .22 })
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x202329, roughness: .31, metalness: .8 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: .57, metalness: .04 })
  const harnessMaterial = new THREE.MeshStandardMaterial({ color: 0x46454a, roughness: .66, metalness: .08 })
  const sweaterTexture = knitTexture()
  const sweaterMaterial = new THREE.MeshStandardMaterial({
    color: 0xb4b0ae,
    map: sweaterTexture,
    bumpMap: sweaterTexture,
    bumpScale: .13,
    roughness: .95,
  })
  const blue = new THREE.MeshBasicMaterial({ color: 0x4b9cff })

  const bust = new THREE.Group()
  root.add(bust)
  const bodyProfile = [
    new THREE.Vector2(0, -3.8), new THREE.Vector2(1.3, -3.8), new THREE.Vector2(1.42, -3.2),
    new THREE.Vector2(1.45, -2.3), new THREE.Vector2(1.42, -1.6), new THREE.Vector2(1.32, -1.15),
    new THREE.Vector2(1.1, -.82), new THREE.Vector2(.8, -.55), new THREE.Vector2(.45, -.4), new THREE.Vector2(0, -.38),
  ]
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 80), sweaterMaterial)
  body.scale.set(1.45, 1, .6)
  body.castShadow = true
  body.receiveShadow = true
  bust.add(body)
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.63, .19, 18, 48), sweaterMaterial)
  collar.rotation.x = Math.PI / 2
  collar.scale.set(1, .64, .84)
  collar.position.set(0, -.31, .08)
  collar.castShadow = true
  bust.add(collar)
  makeHarness(bust, harnessMaterial, darkMetal)

  // Three visible ports and three, and only three, thick signal cables.
  const cableGroup = new THREE.Group()
  const cableStarts = [-1.22, 0, 1.22]
  cableStarts.forEach((x, index) => {
    const port = makePort(darkMetal, caseShadow)
    port.position.set(x * .72, .12, -.74)
    port.rotation.y = Math.PI / 2
    cableGroup.add(port)
    const sway = index === 0 ? -.42 : index === 2 ? .42 : 0
    cableGroup.add(cable([
      new THREE.Vector3(x * .72, .1, -.78),
      new THREE.Vector3(x * .72 + sway * .3, -.48, -.64),
      new THREE.Vector3(x * .72 + sway, -1.48, -.38),
      new THREE.Vector3(x * .72 + sway * .8, -2.48, -.2),
      new THREE.Vector3(x * .72 + sway * .62, -3.5, -.08),
    ], rubber))
  })
  root.add(cableGroup)

  const artifacts = makeChapterArtifacts(blue, caseShadow, darkMetal)
  root.add(artifacts.group)

  const pivot = new THREE.Group()
  pivot.position.y = .35
  root.add(pivot)
  const neck = new THREE.Group()
  neck.position.y = .03
  pivot.add(neck)
  neck.add(new THREE.Mesh(new THREE.CylinderGeometry(.34, .4, .82, 28), darkMetal))
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.39 - i * .008, .055, 10, 32), caseShadow)
    ring.rotation.x = Math.PI / 2
    ring.position.y = -.28 + i * .145
    ring.castShadow = true
    neck.add(ring)
  }
  const neckPlate = new THREE.Mesh(new THREE.CylinderGeometry(.25, .3, .08, 24), blue)
  neckPlate.position.y = -.34
  neck.add(neckPlate)

  const tv = new THREE.Group()
  tv.position.y = 1.14
  pivot.add(tv)
  const casingGeometry = taperedRoundedBox(2.3, 2.1, 1.7, .24, .1)
  const shell = new THREE.Mesh(casingGeometry, caseMaterial)
  shell.castShadow = true
  shell.receiveShadow = true
  tv.add(shell)
  const bezel = new THREE.Mesh(taperedRoundedBox(2.12, 1.9, .14, .17, .03), caseShadow)
  bezel.position.z = .9
  tv.add(bezel)
  const panel = new THREE.Mesh(taperedRoundedBox(1.98, 1.76, .14, .14, .03), bezelMaterial)
  panel.position.z = .92
  tv.add(panel)
  const screenGeometry = new THREE.PlaneGeometry(1.7, 1.46, 28, 24)
  const screenPositions = screenGeometry.attributes.position
  for (let i = 0; i < screenPositions.count; i++) {
    const x = screenPositions.getX(i) / .85
    const y = screenPositions.getY(i) / .73
    screenPositions.setZ(i, .035 * (1 - (x * x + y * y) / 2))
  }
  screenGeometry.computeVertexNormals()
  screenGeometry.computeBoundingBox()
  const screen = new THREE.Mesh(screenGeometry, reel.material)
  screen.position.set(0, 0, .985)
  screen.name = 'telebot-screen'
  tv.add(screen)
  const glass = new THREE.Mesh(screenGeometry.clone(), new THREE.MeshPhysicalMaterial({ color: 0xdce8ff, transparent: true, opacity: .075, roughness: .08, clearcoat: 1, clearcoatRoughness: .08 }))
  glass.position.set(0, 0, .99)
  tv.add(glass)

  // Front control row: tactile, quiet details rather than extra emitters.
  for (let i = 0; i < 5; i++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(.1, .045, .035), i === 0 ? blue : caseShadow)
    led.position.set(.4 + i * .115, -.81, .995)
    tv.add(led)
  }
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .08, 24), darkMetal)
  dial.rotation.x = Math.PI / 2
  dial.position.set(-.78, -.81, 1)
  tv.add(dial)
  for (let i = 0; i < 6; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(.03, .36, .022), darkMetal)
    vent.position.set(-1.22 + i * .11, .5, -.78)
    tv.add(vent)
  }

  for (const side of [-1, 1]) {
    const headphones = new THREE.Group()
    headphones.position.set(side * 1.26, .1, .15)
    headphones.rotation.z = -side * (Math.PI / 2)
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .22, 48), bezelMaterial)
    headphones.add(cup)
    const headphoneRing = new THREE.Mesh(new THREE.TorusGeometry(.4, .03, 14, 48), caseShadow)
    headphoneRing.rotation.x = -Math.PI / 2
    headphoneRing.position.y = .115
    headphones.add(headphoneRing)
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(.3, .33, .05, 40), darkMetal)
    dome.position.y = .125
    headphones.add(dome)
    const inner = new THREE.Mesh(new THREE.TorusGeometry(.17, .014, 10, 36), blue)
    inner.rotation.x = -Math.PI / 2
    inner.position.y = .155
    headphones.add(inner)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .04, 28), darkMetal)
    cap.position.y = .16
    headphones.add(cap)
    tv.add(headphones)
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.04, .055, 10, 48, Math.PI * .92), caseMaterial)
  band.rotation.y = Math.PI / 2
  band.position.set(0, .02, -.64)
  tv.add(band)

  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = mesh.castShadow || true
      mesh.receiveShadow = true
    }
  })

  const gazeTarget = new THREE.Vector2()
  const gaze = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const screenCenterNdc = new THREE.Vector3()
  const projectedCorner = new THREE.Vector3()
  const screenPixelBounds = { left: 0, right: 1, top: 0, bottom: 1 }
  let viewport = { width: 1, height: 1 }
  let currentQuality = quality
  let lastInteraction = performance.now()
  let lastDanceToken = 0
  let lastInteractionPulse = -1
  let danceUntil = 0
  let disposed = false
  let lastArtifactChapter = ''

  function syncChapterArtifacts(chapter: string): void {
    const normalized = chapter.trim().toLowerCase()
    if (normalized === lastArtifactChapter) return
    lastArtifactChapter = normalized
    const research = /research|origin|scope|study/.test(normalized)
    const impact = /impact|outcome|signal|result/.test(normalized)
    const caseFile = !research && !impact
    artifacts.research.visible = research
    artifacts.impact.visible = impact
    artifacts.caseFile.visible = caseFile
    artifacts.group.visible = Boolean(normalized)
  }

  function resize(width: number, height: number): void {
    viewport = { width: Math.max(1, width), height: Math.max(1, height) }
    camera.aspect = viewport.width / viewport.height
    camera.fov = 32
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, currentQuality === 'high' ? 1.75 : 1))
    renderer.setSize(viewport.width, viewport.height, false)
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const neededHeight = 5.4
    const neededWidth = 4.7
    const distance = Math.max(
      neededHeight / (2 * tangent),
      neededWidth / (2 * tangent * camera.aspect),
    )
    const lookY = 0.25
    camera.position.set(0, lookY + .1, distance)
    camera.lookAt(0, lookY, 0)
    camera.updateProjectionMatrix()
  }

  function setQuality(next: TelebotQuality): void {
    currentQuality = next
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, next === 'high' ? 1.75 : 1))
    renderer.shadowMap.enabled = next === 'high'
    renderer.setSize(viewport.width, viewport.height, false)
    // Changing renderer settings is intentionally in-place: no context rebuild loop.
  }

  function setActive(active: boolean, motionAllowed = true): void {
    reel.setActive(active, motionAllowed)
  }

  function updateProjectedScreenBounds(rect: DOMRect): void {
    screen.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()
    screen.getWorldPosition(screenCenterNdc).project(camera)
    const bounds = screen.geometry.boundingBox
    if (!bounds) {
      screenPixelBounds.left = rect.left
      screenPixelBounds.right = rect.right
      screenPixelBounds.top = rect.top
      screenPixelBounds.bottom = rect.bottom
      return
    }
    screenPixelBounds.left = Infinity
    screenPixelBounds.right = -Infinity
    screenPixelBounds.top = Infinity
    screenPixelBounds.bottom = -Infinity
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          projectedCorner.set(x, y, z).applyMatrix4(screen.matrixWorld).project(camera)
          const pixelX = rect.left + (projectedCorner.x + 1) * .5 * rect.width
          const pixelY = rect.top + (1 - projectedCorner.y) * .5 * rect.height
          screenPixelBounds.left = Math.min(screenPixelBounds.left, pixelX)
          screenPixelBounds.right = Math.max(screenPixelBounds.right, pixelX)
          screenPixelBounds.top = Math.min(screenPixelBounds.top, pixelY)
          screenPixelBounds.bottom = Math.max(screenPixelBounds.bottom, pixelY)
        }
      }
    }
  }

  function setPointer(clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } {
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    pointerNdc.set(
      THREE.MathUtils.clamp((clientX - rect.left) / width, 0, 1) * 2 - 1,
      1 - THREE.MathUtils.clamp((clientY - rect.top) / height, 0, 1) * 2,
    )
    updateProjectedScreenBounds(rect)
    const centerX = rect.left + (screenCenterNdc.x + 1) * .5 * rect.width
    const centerY = rect.top + (1 - screenCenterNdc.y) * .5 * rect.height
    const screenWidth = Math.max(1, screenPixelBounds.right - screenPixelBounds.left)
    const screenHeight = Math.max(1, screenPixelBounds.bottom - screenPixelBounds.top)
    gazeTarget.set(
      THREE.MathUtils.clamp((clientX - centerX) / (screenWidth * .5), -1, 1),
      THREE.MathUtils.clamp((centerY - clientY) / (screenHeight * .5), -1, 1),
    )

    // The CRT lens receives the actual mesh UV instead of a hand-tuned
    // rectangle ratio. The glass is intentionally skipped so the screen mesh
    // remains the source of truth for pointer coordinates.
    raycaster.setFromCamera(pointerNdc, camera)
    const hit = raycaster.intersectObject(screen, false)[0]
    if (hit?.uv) reel.setPointer(hit.uv.x, 1 - hit.uv.y)
    lastInteraction = performance.now()
    return { x: gazeTarget.x, y: gazeTarget.y }
  }

  function next(): void {
    reel.next()
    reel.triggerShockwave()
    lastInteraction = performance.now()
  }

  function render(time: number, state: Readonly<TelebotState>, reducedMotion: boolean): void {
    if (disposed) return
    if (state.interactionPulse !== lastInteractionPulse) {
      lastInteractionPulse = state.interactionPulse
      lastInteraction = time
    }
    const target = state.gazeTargetId ? state.gazeTarget : state.mouseNDC
    const idleFor = time - lastInteraction
    const sleeping = idleFor > 10000 && state.mood === 'idle'
    const ease = reducedMotion ? 1 : .075
    const targetX = reducedMotion ? 0 : target.x
    const targetY = reducedMotion ? 0 : target.y
    gaze.x += (targetX - gaze.x) * ease
    gaze.y += (targetY - gaze.y) * ease
    const quietTarget = sleeping ? 0 : 1
    gaze.multiplyScalar(quietTarget)
    const springYaw = reducedMotion ? 0 : THREE.MathUtils.clamp(gaze.x, -1, 1) * .14
    const springPitch = reducedMotion ? 0 : THREE.MathUtils.clamp(gaze.y, -1, 1) * .075
    pivot.rotation.y += (springYaw - pivot.rotation.y) * (reducedMotion ? 1 : .065)
    pivot.rotation.x += (springPitch - pivot.rotation.x) * (reducedMotion ? 1 : .065)
    const bustYaw = reducedMotion || sleeping ? 0 : gaze.x * .045
    bust.rotation.y += (bustYaw - bust.rotation.y) * (reducedMotion ? 1 : .035)

    if (state.danceToken !== lastDanceToken) {
      lastDanceToken = state.danceToken
      danceUntil = time + 900
      lastInteraction = time
    }
    const dance = reducedMotion ? 0 : THREE.MathUtils.clamp((danceUntil - time) / 900, 0, 1)
    root.rotation.z += (Math.sin(time * .014) * .018 * dance - root.rotation.z) * .1
    const idleBob = reducedMotion ? 0 : Math.sin(time * .0012) * .018
    const danceBob = reducedMotion ? 0 : Math.sin(time * .02) * .035 * dance
    root.position.y += ((sleeping ? -.18 : -.08) + idleBob + danceBob - root.position.y) * (reducedMotion ? 1 : .05)

    const screenState = sleeping ? { ...state, mood: 'sleep' as const, channel: 'face' as const } : state
    syncChapterArtifacts(screenState.currentChapter || screenState.chapterLabel || 'HERO')
    reel.update({ state: screenState, reducedMotion, time })
    renderer.render(scene, camera)
  }

  function renderStatic(state: Readonly<TelebotState>, reducedMotion: boolean): void {
    render(performance.now(), state, reducedMotion)
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    disposeObject(root)
    reel.dispose()
    environment.dispose()
    scene.environment = null
    renderer.renderLists.dispose()
    renderer.dispose()
    renderer.forceContextLoss?.()
  }

  setQuality(quality)
  return { reel, resize, setQuality, setActive, setPointer, next, render, renderStatic, dispose }
}
