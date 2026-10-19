declare module '*.glsl?raw' {
  const content: string
  export default content
}

declare module '*.glsl' {
  const content: string
  export default content
}

declare module '*.vert?raw' {
  const content: string
  export default content
}

declare module '*.frag?raw' {
  const content: string
  export default content
}

declare module '*.wasm' {
  const content: string
  export default content
}

declare module '@studio-freight/lenis' {
  interface LenisOptions {
    duration?: number
    easing?: (t: number) => number
    orientation?: 'vertical' | 'horizontal'
    gestureOrientation?: 'vertical' | 'horizontal' | 'both'
    smoothWheel?: boolean
    smoothTouch?: boolean
    touchMultiplier?: number
    wheelMultiplier?: number
    infinite?: boolean
    wrapper?: HTMLElement | Window
    content?: HTMLElement
  }

  interface ScrollCallbackArgs {
    scroll: number
    progress: number
  }

  type ScrollToOpts = {
    offset?: number
    immediate?: boolean
    lock?: boolean
    duration?: number
    easing?: (t: number) => number
    lerp?: number
    onComplete?: () => void
    force?: boolean
    programmatic?: boolean
  }

  export default class Lenis {
    constructor(options?: LenisOptions)
    on(event: 'scroll', callback: (args: ScrollCallbackArgs) => void): void
    raf(time: number): void
    scrollTo(target: number | string | HTMLElement, opts?: ScrollToOpts): void
    start(): void
    stop(): void
    destroy(): void
  }
}

declare module 'hydra-synth'
