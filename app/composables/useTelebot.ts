import { readonly } from 'vue'

/** Channels understood by the CRT reel. The first group is kept for legacy callers. */
export type TelebotChannel =
  | 'idle' | 'noise' | 'term' | 'chapter' | 'mood' | 'smile'
  | 'face' | 'beats' | 'scope' | 'signal' | 'reel' | 'project' | 'happy'

export type TelebotMood =
  | 'idle' | 'thinking' | 'speaking' | 'happy'
  | 'calm' | 'wow' | 'sleep'

export interface TelebotState {
  mood: TelebotMood
  channel: TelebotChannel
  gazeTarget: { x: number; y: number }
  gazeTargetId: string | null
  termText: string
  chapterLabel: string
  termCursorBlink: boolean
  mouseNDC: { x: number; y: number }
  mediaIndex: number
  projectId: string | null
  currentChapter: string
  /** A monotonically increasing pulse for short interaction animations. */
  interactionPulse: number
  /** Set by dance(); renderers can consume this without owning a timer. */
  danceToken: number
}

export interface TelebotAPI {
  state: Readonly<TelebotState>
  setMood(mood: TelebotMood): void
  setChannel(ch: TelebotChannel): void
  setGazeTarget(id: string | null, ndc?: { x: number; y: number }): void
  setMouseNDC(ndc: { x: number; y: number }): void
  streamText(token: string): void
  clearText(): void
  setChapterLabel(label: string): void
  playMedia(index: number): void
  setProjectPreview(id: string | null): void
  dance(): void
  pause(): void
  resume(): void
  isPaused(): boolean
}

const initialState = (): TelebotState => ({
  mood: 'idle',
  channel: 'idle',
  gazeTarget: { x: 0, y: 0 },
  gazeTargetId: null,
  termText: '',
  chapterLabel: '',
  termCursorBlink: true,
  mouseNDC: { x: 0, y: 0 },
  mediaIndex: 0,
  projectId: null,
  currentChapter: 'HERO',
  interactionPulse: 0,
  danceToken: 0,
})

/**
 * Shared app state without a module singleton. `useState` gives Nuxt one state
 * instance per SSR request and one hydrated instance in the browser, while
 * keeping this composable safe to call from any component setup function.
 *
 * The old implementation owned a process-wide interval for the terminal
 * cursor. That made HMR and SSR leak timers. The visual renderer now derives
 * the blink phase from its frame clock, so this state surface stays passive.
 */
export function useTelebot(): TelebotAPI {
  const stateRef = useState<TelebotState>('telebot-state', initialState)
  const pausedRef = useState<boolean>('telebot-paused', () => false)
  const state = stateRef.value

  const isPaused = () => pausedRef.value

  const api: TelebotAPI = {
    state: readonly(state) as Readonly<TelebotState>,

    setMood(mood) {
      state.mood = mood
      // Preserve historical side effects used by Hero/Ask components.
      if (mood === 'speaking') state.channel = 'term'
      else if (mood === 'thinking') state.channel = 'mood'
      else if (mood === 'happy') state.channel = 'smile'
      else if (mood === 'sleep') state.channel = 'face'
      // Calm/idle ends an answer without discarding its terminal screen. A
      // later explicit channel choice can still switch to the face or reel.
      else if (!state.termText || state.channel !== 'term') state.channel = 'idle'
      state.interactionPulse++
    },

    setChannel(channel) {
      state.channel = channel
      state.interactionPulse++
    },

    setGazeTarget(id, ndc) {
      state.gazeTargetId = id
      if (ndc) {
        state.gazeTarget.x = ndc.x
        state.gazeTarget.y = ndc.y
      }
    },

    setMouseNDC(ndc) {
      state.mouseNDC.x = ndc.x
      state.mouseNDC.y = ndc.y
    },

    streamText(token) {
      state.termText += token
      // Keep long conversations bounded while preserving the latest answer.
      if (state.termText.length > 1400) state.termText = state.termText.slice(-1400)
      state.mood = 'speaking'
      state.channel = 'term'
      state.interactionPulse++
    },

    clearText() {
      state.termText = ''
      state.interactionPulse++
    },

    setChapterLabel(label) {
      state.chapterLabel = label
      state.currentChapter = label.replace(/^CHAPTER\s*[·:/-]?\s*/i, '').trim() || label
      if (!['speaking', 'thinking', 'happy'].includes(state.mood) && !(state.termText && state.channel === 'term')) state.channel = 'chapter'
      state.interactionPulse++
    },

    playMedia(index) {
      state.mediaIndex = Math.max(0, Math.floor(index))
      state.channel = 'reel'
      state.interactionPulse++
    },

    setProjectPreview(id) {
      state.projectId = id || null
      state.channel = id ? 'project' : 'reel'
      state.interactionPulse++
    },

    dance() {
      state.danceToken++
      state.interactionPulse++
      state.mood = 'happy'
      state.channel = 'happy'
    },

    pause() {
      pausedRef.value = true
    },
    resume() {
      pausedRef.value = false
    },
    isPaused,
  }

  return api
}
