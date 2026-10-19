import * as THREE from 'three'
import type { TelebotChannel, TelebotState } from '~/composables/useTelebot'

export interface ScreenMediaItem {
  id?: string
  type: 'image' | 'video' | 'webgl' | string
  src: string
  alt?: string
  caption?: string
  poster?: string
  projectId?: string
  confirmNeeded?: boolean
  verification?: string
}

export interface ScreenProject { id: string; title: string; subtitle?: string; solution?: string }
type ScreenState = Readonly<TelebotState>

export interface ScreenReelOptions {
  media?: ScreenMediaItem[]
  name?: string
  role?: string
  projects?: ScreenProject[]
  onMediaChange?: (item: ScreenMediaItem | null, index: number) => void
  onCaption?: (caption: string) => void
  onInvalidate?: () => void
}

export interface ScreenReelSnapshot {
  state: ScreenState
  reducedMotion: boolean
  time: number
}

const WIDTH = 640
const HEIGHT = 560
const MONO = '700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SMALL_MONO = '600 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uRipple;
  uniform float uShockwave;
  uniform float uShockStrength;
  uniform float uScanline;
  uniform float uVignette;
  uniform float uRgbSplit;
  uniform float uLens;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 fromPointer = uv - uPointer;
    float distanceToPointer = length(fromPointer);
    float ripple = sin(distanceToPointer * 42.0 - uTime * 8.0) * uRipple;
    float ring = (1.0 - smoothstep(0.0, 0.16, abs(distanceToPointer - uShockwave * 0.9))) * uShockStrength;
    vec2 lens = normalize(fromPointer + vec2(0.0001)) * (uLens * (1.0 - smoothstep(0.0, 0.42, distanceToPointer)));
    uv += fromPointer * ripple * 0.012 + fromPointer * ring * 0.014 + lens;

    float split = uRgbSplit * (0.0015 + ring * 0.004);
    float red = texture2D(uMap, uv + vec2(split, 0.0)).r;
    float green = texture2D(uMap, uv).g;
    float blue = texture2D(uMap, uv - vec2(split, 0.0)).b;
    vec3 color = vec3(red, green, blue);

    float scan = 1.0 - uScanline * (0.12 + 0.10 * sin(vUv.y * 720.0));
    vec2 edge = vUv * 2.0 - 1.0;
    float vignette = 1.0 - uVignette * smoothstep(0.22, 1.18, dot(edge * vec2(0.82, 1.0), edge * vec2(0.82, 1.0)));
    color *= scan * vignette;
    color += vec3(0.01, 0.012, 0.018) * (0.5 + 0.5 * sin(uTime * 1.6));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

function clampIndex(index: number, length: number): number {
  if (!length) return 0
  return ((Math.floor(index) % length) + length) % length
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue
      const candidate = line ? `${line} ${word}` : word
      if (candidate.length > maxChars && line) {
        lines.push(line)
        line = word
      } else line = candidate
    }
    lines.push(line)
  }
  return lines
}

/**
 * Canvas-backed CRT content. Keeping the reel independent from the scene
 * makes media loading and screen states testable, while the ShaderMaterial
 * supplies the glass, scanline, lens and RGB-split treatment in 3D.
 */
export class ScreenReel {
  readonly canvas: HTMLCanvasElement
  readonly texture: THREE.CanvasTexture
  readonly material: THREE.ShaderMaterial
  readonly width = WIDTH
  readonly height = HEIGHT

  private readonly ctx: CanvasRenderingContext2D
  private media: ScreenMediaItem[]
  private image: HTMLImageElement | null = null
  private video: HTMLVideoElement | null = null
  private mediaState: 'idle' | 'loading' | 'ready' | 'blocked' | 'error' = 'idle'
  private mediaIndex = 0
  private activeProjectId: string | null = null
  private stageStartedAt: number | null = null
  private introDismissed = false
  private lastTermText = ''
  private termCharacters = 0
  private lastDrawTime = -1
  private pointer = new THREE.Vector2(0.5, 0.5)
  private ripple = 0
  private shockwave = 0
  private shockwaveStart = -Infinity
  private loadKey = ''
  private loadGeneration = 0
  private loadTimeout: ReturnType<typeof setTimeout> | null = null
  private playing = false
  private playPending = false
  private active = true
  private motionAllowed = true
  private lastTime = 0
  private mediaAdvancedAt = 0
  private channelStartedAt = 0
  private lastChannel: TelebotChannel | null = null
  private lastInteractionPulse = -1
  private caption = ''
  private projects: ScreenProject[]
  private disposed = false
  private onMediaChange?: ScreenReelOptions['onMediaChange']
  private name: string
  private role: string
  private onCaption?: ScreenReelOptions['onCaption']
  private onInvalidate?: ScreenReelOptions['onInvalidate']

  constructor(options: ScreenReelOptions = {}) {
    this.name = options.name || 'Shivang Sagar'
    this.role = options.role || 'Product builder · researcher'
    this.media = this.filterMedia(options.media || [])
    this.projects = options.projects || []
    this.onMediaChange = options.onMediaChange
    this.onCaption = options.onCaption
    this.onInvalidate = options.onInvalidate
    this.canvas = document.createElement('canvas')
    this.canvas.width = WIDTH
    this.canvas.height = HEIGHT
    const context = this.canvas.getContext('2d')
    if (!context) throw new Error('MEG CRT canvas is unavailable')
    this.ctx = context
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.texture },
        uTime: { value: 0 },
        uPointer: { value: this.pointer },
        uRipple: { value: 0 },
        uShockwave: { value: 0 },
        uShockStrength: { value: 0 },
        uScanline: { value: 1 },
        uVignette: { value: 0.78 },
        uRgbSplit: { value: 0.34 },
        uLens: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      toneMapped: false,
    })
  }

  setMedia(media: ScreenMediaItem[]): void {
    const nextMedia = this.filterMedia(media)
    const signature = (item: ScreenMediaItem): string => `${item.type}:${item.src}:${item.caption || ''}:${item.alt || ''}:${item.projectId || ''}`
    const same = nextMedia.length === this.media.length
      && nextMedia.every((item, index) => signature(item) === signature(this.media[index]!))
    if (same) return
    this.media = nextMedia
    this.mediaIndex = clampIndex(this.mediaIndex, this.media.length)
    this.loadKey = ''
    this.onInvalidate?.()
  }

  setName(name: string, role?: string): void {
    if (name) this.name = name
    if (role) this.role = role
  }

  setPointer(x: number, y: number): void {
    this.pointer.set(THREE.MathUtils.clamp(x, 0, 1), THREE.MathUtils.clamp(y, 0, 1))
    this.ripple = Math.min(1, this.ripple + 0.08)
    this.onInvalidate?.()
  }

  triggerShockwave(): void {
    this.shockwaveStart = this.lastTime
    this.shockwave = 0.02
    this.ripple = 1
  }

  next(): number {
    this.introDismissed = true
    this.mediaIndex = clampIndex(this.mediaIndex + 1, this.mediaCount() || 3)
    this.mediaAdvancedAt = this.lastTime
    this.triggerShockwave()
    if (this.mediaState === 'blocked') { this.mediaState = 'ready'; this.syncVideoPlayback() }
    this.onMediaChange?.(this.currentMedia(), this.mediaIndex)
    return this.mediaIndex
  }

  setMediaIndex(index: number): void {
    this.mediaIndex = clampIndex(index, this.mediaCount() || 3)
    this.mediaAdvancedAt = this.lastTime
  }

  setProjectId(id: string | null): void {
    this.activeProjectId = id || null
    this.mediaIndex = clampIndex(this.mediaIndex, this.mediaCount() || 3)
    this.loadKey = ''
  }

  setActive(active: boolean, motionAllowed = true): void {
    this.active = active
    this.motionAllowed = motionAllowed
    this.syncVideoPlayback()
  }

  update(snapshot: ScreenReelSnapshot): void {
    if (this.disposed) return
    if (this.stageStartedAt === null) this.stageStartedAt = snapshot.time
    const delta = Math.min(100, Math.max(0, snapshot.time - this.lastTime))
    this.lastTime = snapshot.time
    if (this.lastInteractionPulse < 0) {
      this.lastInteractionPulse = snapshot.state.interactionPulse
      // The hero writes its initial chapter before the scene mounts. Treat
      // that passive state as the boot baseline, while an already-requested
      // media/terminal channel still counts as explicit user intent.
      this.introDismissed = !['idle', 'chapter', 'face', 'smile', 'happy'].includes(snapshot.state.channel)
    } else if (snapshot.state.interactionPulse !== this.lastInteractionPulse) {
      this.lastInteractionPulse = snapshot.state.interactionPulse
      this.introDismissed = true
    }
    if (snapshot.state.channel !== this.lastChannel) {
      this.lastChannel = snapshot.state.channel
      this.channelStartedAt = snapshot.time
      this.mediaAdvancedAt = snapshot.time
    }
    if (snapshot.state.termText !== this.lastTermText) {
      if (!snapshot.state.termText.startsWith(this.lastTermText)) this.termCharacters = 0
      this.lastTermText = snapshot.state.termText
    }
    this.termCharacters = snapshot.reducedMotion ? this.lastTermText.length : Math.min(this.lastTermText.length, this.termCharacters + delta * .11)
    if (snapshot.state.projectId !== this.activeProjectId) this.setProjectId(snapshot.state.projectId)
    if (clampIndex(snapshot.state.mediaIndex, this.mediaCount() || 3) !== this.mediaIndex) this.setMediaIndex(snapshot.state.mediaIndex)
    this.draw(snapshot.time, snapshot.state, snapshot.reducedMotion)
  }

  draw(time: number, state: ScreenState, reducedMotion = false): void {
    if (this.disposed) return
    const elapsed = Math.max(0, (time - (this.stageStartedAt ?? time)) / 1000)
    const ctx = this.ctx
    const t = reducedMotion ? 0 : time / 1000
    const channel = state.channel
    const intro = !this.introDismissed && !reducedMotion
    const booting = intro && elapsed < 1.8
    const blink = reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(t * 2.4)

    this.paintBackground(ctx, t, channel)
    this.playing = !booting && (intro || ['idle', 'reel', 'project'].includes(channel))
    this.syncVideoPlayback()
    if (booting) { this.drawBoot(ctx, elapsed, t); this.publishCaption('SS — a portfolio signal coming online.') }
    else if (intro) {
      // Finish the boot on the reel even when the page has already selected a
      // passive chapter. A later channel pulse dismisses this sequence.
      this.drawMedia(ctx, t, { ...state, channel: 'reel', projectId: null })
    }
    else {
      switch (channel) {
        case 'term':
          this.drawTerminal(ctx, t, state, reducedMotion)
          break
        case 'beats':
        case 'mood':
          this.drawBeats(ctx, t, state, reducedMotion)
          break
        case 'scope':
        case 'chapter':
          this.drawScope(ctx, t, state, reducedMotion)
          break
        case 'signal':
        case 'noise':
          this.drawSignal(ctx, t, state, reducedMotion)
          break
        case 'reel':
        case 'project':
        case 'idle':
          this.drawMedia(ctx, t, state)
          if (!reducedMotion && time - this.mediaAdvancedAt > 9000 && channel !== 'project') this.next()
          break
        case 'happy':
        case 'smile':
        case 'face':
        default:
          this.drawFace(ctx, t, state, reducedMotion)
      }
    }
    this.drawFooter(ctx, state, blink)
    this.texture.needsUpdate = true
    this.lastDrawTime = time

    const elapsedShock = (time - this.shockwaveStart) / 700
    this.shockwave = reducedMotion ? 0 : THREE.MathUtils.clamp(elapsedShock, 0, 1)
    this.ripple *= reducedMotion ? 0 : 0.91
    this.material.uniforms.uTime.value = t
    this.material.uniforms.uPointer.value = this.pointer
    this.material.uniforms.uRipple.value = this.ripple
    this.material.uniforms.uShockwave.value = this.shockwave
    this.material.uniforms.uShockStrength.value = reducedMotion ? 0 : Math.max(0, 1 - elapsedShock)
    this.material.uniforms.uRgbSplit.value = reducedMotion ? 0 : .24 + this.ripple * .8
    this.material.uniforms.uLens.value = reducedMotion ? 0 : Math.min(0.016, this.ripple * 0.008)
  }

  get currentIndex(): number { return this.mediaIndex }
  get currentItem(): ScreenMediaItem | null { return this.currentMedia() }
  get lastRenderedAt(): number { return this.lastDrawTime }
  get currentCaption(): string { return this.caption }

  private publishCaption(caption: string): void {
    if (caption === this.caption) return
    this.caption = caption
    this.onCaption?.(caption)
  }

  dispose(): void {
    this.disposed = true
    this.clearMediaElement()
    this.texture.dispose()
    this.material.dispose()
  }

  private currentMedia(): ScreenMediaItem | null {
    if (!this.media.length) return null
    if (this.activeProjectId) {
      const projectMedia = this.media.filter(item => item.projectId === this.activeProjectId)
      return projectMedia[clampIndex(this.mediaIndex, projectMedia.length)] || null
    }
    return this.media[this.mediaIndex] || null
  }

  private mediaCount(): number {
    if (!this.activeProjectId) return this.media.length
    return this.media.filter(item => item.projectId === this.activeProjectId).length
  }

  private filterMedia(media: ScreenMediaItem[]): ScreenMediaItem[] {
    if (!Array.isArray(media)) return []
    return media.filter(item => item
      && typeof item.src === 'string'
      && item.src.length > 0
      && !/\[?placeholder\b/i.test(item.src)
      && ['image', 'video'].includes(item.type)
      && !item.confirmNeeded
      && item.verification !== 'placeholder')
  }

  private mediaCaption(item: ScreenMediaItem): string {
    return item.caption?.trim() || item.alt?.trim() || item.id || `Media ${this.mediaIndex + 1}`
  }

  private clearMediaElement(): void {
    this.playPending = false
    this.loadGeneration++
    if (this.loadTimeout !== null) clearTimeout(this.loadTimeout)
    this.loadTimeout = null
    if (this.video) {
      this.video.onloadeddata = null
      this.video.onerror = null
      this.video.pause()
      this.video.removeAttribute('src')
      this.video.load()
    }
    if (this.image) {
      this.image.onload = null
      this.image.onerror = null
      this.image.removeAttribute('src')
    }
    this.video = null
    this.image = null
  }

  private loadCurrentMedia(): void {
    if (this.disposed) return
    const item = this.currentMedia()
    const key = `${item?.type || ''}:${item?.src || ''}`
    if (key === this.loadKey) return
    this.loadKey = key
    this.clearMediaElement()
    this.mediaState = item ? 'loading' : 'idle'
    if (!item) return
    // Only explicitly supplied HTTP(S) or local assets; never execute webgl/HTML sources.
    if (!/^(https?:\/\/|\/(?!\/))/.test(item.src) || item.confirmNeeded || item.verification === 'placeholder' || !['image', 'video'].includes(item.type)) {
      this.mediaState = 'error'
      return
    }
    const generation = this.loadGeneration
    const finish = (status: 'ready' | 'error') => {
      if (this.disposed || generation !== this.loadGeneration) return
      if (this.loadTimeout !== null) clearTimeout(this.loadTimeout)
      this.loadTimeout = null
      this.mediaState = status
      this.syncVideoPlayback()
      this.onInvalidate?.()
    }
    this.loadTimeout = setTimeout(() => finish('error'), 15000)
    if (item.type === 'video') {
      const video = document.createElement('video')
      video.muted = true
      video.loop = true
      video.playsInline = true
      video.preload = 'auto'
      video.crossOrigin = 'anonymous'
      video.onloadeddata = () => finish('ready')
      video.onerror = () => finish('error')
       if (item.poster && !/\[?placeholder\b/i.test(item.poster)) video.poster = item.poster
      video.src = item.src
      this.video = video
    } else {
      const image = new Image()
      image.decoding = 'async'
      image.crossOrigin = 'anonymous'
      image.onload = () => finish('ready')
      image.onerror = () => finish('error')
      image.src = item.src
      this.image = image
    }
  }

  private syncVideoPlayback(): void {
    const video = this.video
    if (!video) return
    if (!this.active || !this.motionAllowed || !this.playing || this.mediaState !== 'ready') {
      if (!video.paused) video.pause()
      return
    }
    if (video.paused && !this.playPending) {
      this.playPending = true
      void video.play().then(() => {
        if (this.video !== video || this.disposed) return
        this.playPending = false
        this.mediaState = 'ready'
        if (!this.active || !this.motionAllowed || !this.playing) video.pause()
      }).catch(() => {
        if (this.video !== video || this.disposed) return
        this.playPending = false
        this.mediaState = 'blocked'
        this.onInvalidate?.()
      })
    }
  }

  private paintBackground(ctx: CanvasRenderingContext2D, t: number, channel: TelebotChannel): void {
    const colors = channel === 'signal' || channel === 'noise'
      ? ['#210f16', '#090b17']
      : channel === 'beats'
        ? ['#101b33', '#070a12']
        : ['#0b1322', '#05070d']
    const gradient = ctx.createRadialGradient(WIDTH * .48, HEIGHT * .44, 8, WIDTH * .5, HEIGHT * .5, WIDTH * .75)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(1, colors[1])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = 'rgba(170, 205, 255, .14)'
    for (let i = 0; i < 48; i++) {
      const x = (i * 137.7) % WIDTH
      const y = (i * 83.2) % HEIGHT
      const alpha = 0.25 + 0.18 * Math.sin(t * 1.8 + i)
      ctx.globalAlpha = alpha
      ctx.fillRect(x, y, i % 3 ? 2 : 3, i % 4 ? 2 : 3)
    }
    ctx.globalAlpha = 1
  }

  private drawBoot(ctx: CanvasRenderingContext2D, elapsed: number, t: number): void {
    ctx.fillStyle = '#a9c7ff'
    ctx.font = '600 15px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('PORT 03 · SIGNAL ACQUIRED', 42, 48)
    ctx.strokeStyle = 'rgba(142, 182, 255, .32)'
    ctx.strokeRect(40, 78, WIDTH - 80, 2)
    ctx.font = '700 166px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillStyle = '#eef3ff'
    const count = Math.min(2, Math.floor(elapsed * 2.2))
    ctx.fillText('SS'.slice(0, count), 240, 293)
    if (elapsed % .65 < .4) ctx.fillRect(240 + count * 100, 310, 82, 7)
    ctx.fillStyle = '#7fe6df'
    ctx.font = SMALL_MONO
    ctx.fillText(`loading${'.'.repeat(Math.floor(t * 3) % 4)}  ${Math.floor(Math.min(100, elapsed / 1.8 * 100))}%`, 42, 390)
    ctx.fillStyle = 'rgba(127, 230, 223, .22)'
    ctx.fillRect(42, 414, (WIDTH - 84) * Math.min(1, elapsed / 1.8), 5)
  }

  private drawIdentity(ctx: CanvasRenderingContext2D, elapsed: number, t: number, state: ScreenReelSnapshot['state']): void {
    ctx.fillStyle = '#7fe6df'
    ctx.font = SMALL_MONO
    ctx.fillText('SS / PERSONAL SIGNAL', 42, 52)
    ctx.fillStyle = '#f4f0e8'
    ctx.font = '700 48px ui-monospace, SFMono-Regular, Menlo, monospace'
    const visibleName = Math.floor(Math.min(this.name.length, Math.max(0, (elapsed - 1.8) * 13)))
    ctx.fillText(this.name.slice(0, visibleName), 42, 192)
    ctx.fillStyle = '#a9c7ff'
    ctx.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace'
    const visibleRole = this.role.slice(0, Math.max(0, Math.floor((elapsed - 2.6) * 40)))
    wrapText(visibleRole, 49).slice(0, 2).forEach((line, i) => ctx.fillText(line, 45, 240 + i * 28))
    ctx.fillStyle = 'rgba(244, 240, 232, .66)'
    ctx.font = SMALL_MONO
    ctx.fillText(state.chapterLabel || 'CHAPTER · 01 · HERO', 45, 302)
    ctx.fillStyle = '#ffbf73'
    ctx.fillRect(45, 336, 118 + Math.sin(t * 3) * 18, 3)
    ctx.fillStyle = 'rgba(244, 240, 232, .55)'
    ctx.fillText('pointer-aware / media-ready / no guesses', 45, 386)
  }

  private drawTerminal(ctx: CanvasRenderingContext2D, t: number, state: ScreenReelSnapshot['state'], reducedMotion: boolean): void {
    ctx.fillStyle = '#8bffb3'
    ctx.font = SMALL_MONO
    ctx.fillText('TERM://MEG  ·  STREAM', 36, 42)
    ctx.strokeStyle = 'rgba(139, 255, 179, .3)'
    ctx.strokeRect(34, 62, WIDTH - 68, HEIGHT - 112)
    const text = state.termText ? state.termText.slice(0, Math.floor(this.termCharacters)) : 'awaiting prompt…\n\nTry the Ask chapter to stream a grounded answer.'
    this.publishCaption(`Terminal · ${text || 'Receiving answer…'}`)
    const maxLines = 14
    const lines = wrapText(text, 62).slice(-maxLines)
    ctx.font = MONO
    ctx.fillStyle = '#a8ffc2'
    lines.forEach((line, index) => ctx.fillText(line, 52, 101 + index * 23))
    const blink = reducedMotion || Math.sin(t * 4) > 0
    if (blink) {
      const last = lines[lines.length - 1] || ''
      ctx.fillRect(54 + Math.min(last.length, 60) * 10, 88 + (lines.length - 1) * 23, 9, 18)
    }
    ctx.fillStyle = 'rgba(139, 255, 179, .58)'
    ctx.font = SMALL_MONO
    ctx.fillText(`cursor ${reducedMotion ? 'paused' : 'live'}  ·  ${String(Math.floor(t * 10) % 1000).padStart(3, '0')}`, 38, HEIGHT - 28)
  }

  private drawBeats(ctx: CanvasRenderingContext2D, t: number, state: ScreenReelSnapshot['state'], reducedMotion: boolean): void {
    this.publishCaption(state.mood === 'thinking' ? 'Thinking · designed attention beats, not microphone audio.' : 'Beats · designed equalizer, not microphone audio.')
    ctx.fillStyle = '#a9c7ff'
    ctx.font = SMALL_MONO
    ctx.fillText('BEATS://ATTENTION  ·  DESIGNED SIGNAL', 36, 42)
    const bars = 22
    const gap = 10
    const width = (WIDTH - 80 - gap * (bars - 1)) / bars
    const motion = reducedMotion ? 0.3 : 1
    for (let i = 0; i < bars; i++) {
      const wave = (Math.sin(t * 2.6 * motion + i * .46) + Math.sin(t * 4.4 * motion + i * 1.37) + 2) / 4
      const input = THREE.MathUtils.clamp(0.68 + state.mouseNDC.x * .18, .2, 1)
      const height = 34 + wave * input * 250
      const x = 40 + i * (width + gap)
      const gradient = ctx.createLinearGradient(0, HEIGHT - 64 - height, 0, HEIGHT - 64)
      gradient.addColorStop(0, '#ffbf73')
      gradient.addColorStop(.5, '#7fe6df')
      gradient.addColorStop(1, '#6685ff')
      ctx.fillStyle = gradient
      ctx.fillRect(x, HEIGHT - 64 - height, width, height)
    }
    ctx.fillStyle = '#f4f0e8'
    ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('gentle signal', 40, 112)
  }

  private drawScope(ctx: CanvasRenderingContext2D, t: number, state: ScreenReelSnapshot['state'], reducedMotion: boolean): void {
    this.publishCaption(`Scope · ${state.chapterLabel || state.currentChapter || 'Chapter trace'}`)
    ctx.fillStyle = '#7fe6df'
    ctx.font = SMALL_MONO
    ctx.fillText(`SCOPE://${state.currentChapter || 'CHAPTER'}  ·  TRACE`, 36, 42)
    ctx.strokeStyle = 'rgba(127, 230, 223, .16)'
    ctx.lineWidth = 1
    for (let x = 36; x <= WIDTH - 36; x += 58) { ctx.beginPath(); ctx.moveTo(x, 68); ctx.lineTo(x, HEIGHT - 52); ctx.stroke() }
    for (let y = 92; y <= HEIGHT - 52; y += 52) { ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(WIDTH - 36, y); ctx.stroke() }
    const amp = 62 + state.mouseNDC.y * -24
    const phase = reducedMotion ? 0 : t * 3
    ;([['#7fe6df', 1, 0], ['#ffbf73', .42, 1.7]] as const).forEach(([color, scale, offset]) => {
      ctx.strokeStyle = color
      ctx.lineWidth = scale === 1 ? 3 : 2
      ctx.beginPath()
      for (let x = 36; x <= WIDTH - 36; x += 4) {
        const y = HEIGHT / 2 + Math.sin(x * .034 + phase + offset) * amp * scale * (.55 + .45 * Math.sin(x * .08 + phase * .4))
        if (x === 36) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })
    ctx.fillStyle = '#f4f0e8'
    ctx.font = '700 26px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText(state.chapterLabel || 'watch the work take shape', 42, HEIGHT - 82)
  }

  private drawSignal(ctx: CanvasRenderingContext2D, t: number, state: ScreenReelSnapshot['state'], reducedMotion: boolean): void {
    this.publishCaption('Signal · NOISE ≠ FAILURE. Designed signal study, not a system error.')
    ctx.fillStyle = '#ff8c9c'
    ctx.font = SMALL_MONO
    ctx.fillText('SIGNAL://STUDY  ·  DESIGNED INTERFERENCE', 36, 42)
    ctx.fillStyle = '#ff667e'
    ctx.font = '700 46px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.fillText('NOISE ≠ FAILURE', 38, 166)
    ctx.fillStyle = 'rgba(255, 140, 156, .82)'
    ctx.font = MONO
    wrapText(state.termText || 're-routing attention through the quiet channel.', 54).slice(0, 5).forEach((line, i) => ctx.fillText(line, 40, 220 + i * 24))
    if (!reducedMotion) {
      for (let i = 0; i < 9; i++) {
        const y = 80 + ((i * 61 + t * 150) % (HEIGHT - 110))
        ctx.fillStyle = i % 2 ? 'rgba(255, 102, 126, .32)' : 'rgba(244, 240, 232, .22)'
        ctx.fillRect(0, y, 180 + ((i * 97) % 280), 3 + (i % 3))
      }
    }
  }

  private drawFace(ctx: CanvasRenderingContext2D, t: number, state: ScreenReelSnapshot['state'], reducedMotion: boolean): void {
    const idle = state.mood === 'sleep'
    const faceTime = reducedMotion ? 4.25 : Math.max(0, (this.lastTime - this.channelStartedAt) / 1000)
    const pointerX = THREE.MathUtils.clamp(state.mouseNDC.x, -1, 1)
    const pointerY = THREE.MathUtils.clamp(state.mouseNDC.y, -1, 1)
    this.publishCaption(idle
      ? 'MEG is resting. Move the pointer or choose a channel to wake.'
      : faceTime < 2.7 ? 'MEG glyph handshake · pointer-aware CRT face.' : 'MEG face · listening for the next signal.')

    ctx.fillStyle = '#04070a'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = 'rgba(255,255,255,.48)'
    for (let i = 0; i < 70; i++) {
      const x = (i * 97.37) % WIDTH
      const y = (i * 61.91) % HEIGHT
      const size = 1 + ((i * 17) % 3)
      ctx.globalAlpha = reducedMotion ? .28 : .24 + .18 * Math.sin(t * 2 + i)
      ctx.fillRect(x, y, size, size)
    }
    ctx.globalAlpha = 1

    const drawGlyph = (alpha: number): void => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = '#f4f4f4'
      ctx.lineWidth = 13
      ctx.lineCap = 'round'
      const wobble = (n: number) => reducedMotion ? 0 : Math.sin(t * 9 + n) * 1.6
      const drawStar = (cx: number, cy: number, flip: number): void => {
        const segments = [
          [0, -70, 0, 70],
          [-85, 8, 85, 8],
          [flip * -62, -50, flip * 62, 52],
        ]
        segments.forEach(([x1, y1, x2, y2], index) => {
          ctx.beginPath()
          ctx.moveTo(cx + x1 + wobble(index), cy + y1)
          ctx.lineTo(cx + x2, cy + y2 + wobble(index + 3))
          ctx.stroke()
        })
      }
      drawStar(WIDTH / 2 - 110, HEIGHT / 2, 1)
      drawStar(WIDTH / 2 + 110, HEIGHT / 2, -1)
      ctx.beginPath()
      ctx.arc(WIDTH / 2, HEIGHT / 2 + 20, 92, Math.PI * 1.1, Math.PI * 1.9)
      ctx.stroke()
      ctx.restore()
    }

    const drawEyes = (alpha: number): void => {
      const phase = reducedMotion ? 0 : t % 4.2
      const blinkY = phase > 4.05 ? 1 - Math.sin(((phase - 4.05) / .15) * Math.PI) * .92 : 1
      const radius = 72
      ctx.save()
      ctx.globalAlpha = alpha
      for (const side of [-1, 1]) {
        const ex = WIDTH / 2 + side * 118 + pointerX * 40
        const ey = HEIGHT / 2 - pointerY * 28
        ctx.save()
        ctx.translate(ex, ey)
        ctx.scale(1, idle ? .08 : blinkY)
        ctx.globalCompositeOperation = 'lighter'
        ;([['rgba(90,170,255,.55)', -6], ['rgba(255,150,80,.5)', 6]] as const).forEach(([color, offset]) => {
          const glow = ctx.createRadialGradient(offset, 0, 0, offset, 0, radius * 1.15)
          glow.addColorStop(0, color)
          glow.addColorStop(.7, color)
          glow.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(offset, 0, radius * 1.15, 0, Math.PI * 2)
          ctx.fill()
        })
        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
        core.addColorStop(0, '#ffffff')
        core.addColorStop(.65, '#fffaf0')
        core.addColorStop(.9, 'rgba(255,240,225,.85)')
        core.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = core
        ctx.beginPath()
        ctx.arc(0, 0, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.restore()
    }

    const glyphAlpha = THREE.MathUtils.clamp((2.2 - faceTime) / .4, 0, 1)
    const eyesAlpha = THREE.MathUtils.clamp((faceTime - 2) / .5, 0, 1)
    if (glyphAlpha > 0) drawGlyph(glyphAlpha)
    if (eyesAlpha > 0) drawEyes(eyesAlpha)
    if (idle) {
      ctx.save()
      ctx.fillStyle = 'rgba(169, 199, 255, .9)'
      ctx.font = '700 28px ui-monospace, SFMono-Regular, Menlo, monospace'
      const drift = reducedMotion ? 0 : Math.sin(t * 1.4) * 5
      ctx.fillText('z', WIDTH - 150, 132 + drift)
      ctx.font = '700 20px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.fillText('z', WIDTH - 116, 105 + drift * .7)
      ctx.restore()
    }
  }

  private drawMedia(ctx: CanvasRenderingContext2D, _t: number, state: ScreenReelSnapshot['state']): void {
    if (!this.mediaAdvancedAt) this.mediaAdvancedAt = this.lastTime
    const item = this.currentMedia()
    const project = this.projects.find(item => item.id === state.projectId)
    ctx.fillStyle = '#f4f0e8'
    ctx.font = SMALL_MONO
    ctx.fillText(state.channel === 'project' ? 'PROJECT://PREVIEW' : 'SS / PORTFOLIO REEL', 36, 42)
    if (!item) {
      if (this.video || this.image) {
        this.loadKey = ''
        this.clearMediaElement()
        this.mediaState = 'idle'
      }
      const designs = [
        { title: this.name, subtitle: this.role },
        { title: 'IDEA → INTERFACE', subtitle: 'An original signal study. Not a project screenshot.' },
        { title: 'MAKE IT TANGIBLE', subtitle: 'An original type study. Not personal media.' },
      ]
      const design = designs[clampIndex(this.mediaIndex, designs.length)]!
      const title = state.channel === 'project' ? project?.title || 'PROJECT NOT FOUND' : design.title
      const subtitle = state.channel === 'project' ? project?.subtitle || project?.solution || 'No media supplied for this project.' : design.subtitle
      this.drawNoMedia(ctx, title, subtitle)
      this.publishCaption(`${title} · ${subtitle} · Designed no-media screen; no photo or video supplied.`)
      return
    }
    this.loadCurrentMedia()
    if (this.mediaState === 'error') {
      this.drawNoMedia(ctx, 'MEDIA UNAVAILABLE', 'The supplied asset could not be loaded safely. Choose next to continue.')
      this.publishCaption(`Media unavailable · ${this.mediaCaption(item)}. Choose the next screen to continue.`)
      return
    }
    if (this.mediaState !== 'ready' && this.mediaState !== 'blocked') {
      this.drawNoMedia(ctx, 'LOADING MEDIA', this.mediaCaption(item))
      this.publishCaption(`Loading media · ${this.mediaCaption(item)}`)
      return
    }
    const source = this.video || this.image
    if (!source) return
    const sourceWidth = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth || WIDTH
    const sourceHeight = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).naturalHeight || HEIGHT
    const scale = Math.min((WIDTH - 80) / sourceWidth, (HEIGHT - 148) / sourceHeight)
    const dw = sourceWidth * scale
    const dh = sourceHeight * scale
    const x = (WIDTH - dw) / 2
    const y = 76 + (HEIGHT - 112 - dh) / 2
    ctx.fillStyle = '#070a10'
    ctx.fillRect(30, 58, WIDTH - 60, HEIGHT - 96)
    try { ctx.drawImage(source, x, y, dw, dh) } catch { this.mediaState = 'error' }
    ctx.fillStyle = 'rgba(7, 10, 16, .82)'
    ctx.fillRect(30, HEIGHT - 74, WIDTH - 60, 36)
    ctx.fillStyle = '#f4f0e8'
    ctx.font = SMALL_MONO
     const caption = this.mediaCaption(item)
     ctx.fillText(caption, 46, HEIGHT - 51)
     this.publishCaption(`${state.channel === 'project' ? `${project?.title || state.projectId} · ` : ''}${caption}${this.mediaState === 'blocked' ? ' · Video paused by browser; choose next to retry.' : ''}`)
  }

  private drawNoMedia(ctx: CanvasRenderingContext2D, title: string, subtitle: string): void {
    ctx.strokeStyle = 'rgba(244, 240, 232, .26)'
    ctx.setLineDash([3, 7])
    ctx.strokeRect(40, 76, WIDTH - 80, HEIGHT - 142)
    ctx.setLineDash([])
    ctx.fillStyle = '#f4f0e8'
    ctx.font = '700 40px ui-monospace, SFMono-Regular, Menlo, monospace'
    wrapText(title.toUpperCase(), 24).slice(0, 2).forEach((line, i) => ctx.fillText(line, 70, 203 + i * 50))
    ctx.fillStyle = 'rgba(244, 240, 232, .62)'
    ctx.font = SMALL_MONO
    wrapText(subtitle, 65).slice(0, 3).forEach((line, i) => ctx.fillText(line, 72, 294 + i * 22))
    ctx.fillStyle = '#ffbf73'
    ctx.fillRect(72, 366, 70, 4)
    ctx.fillStyle = '#a9c7ff'
    ctx.fillText(title.includes('MEDIA') ? 'MEDIA FALLBACK · CHOOSE NEXT' : 'DESIGNED NO-MEDIA SCREEN', 72, 410)
  }

  private drawFooter(ctx: CanvasRenderingContext2D, state: ScreenReelSnapshot['state'], blink: number): void {
    ctx.fillStyle = 'rgba(3, 5, 10, .74)'
    ctx.fillRect(0, HEIGHT - 34, WIDTH, 34)
    ctx.fillStyle = 'rgba(244, 240, 232, .72)'
    ctx.font = SMALL_MONO
    ctx.fillText(`${state.chapterLabel || state.currentChapter || 'HERO'}  ·  ${state.channel.toUpperCase()}`, 26, HEIGHT - 12)
    ctx.fillStyle = `rgba(127, 230, 223, ${.45 + blink * .35})`
    ctx.fillRect(WIDTH - 52, HEIGHT - 20, 8, 8)
  }
}

export function createScreenMaterial(reel: ScreenReel): THREE.ShaderMaterial {
  return reel.material
}
