// Sub-phase C — JS <-> C++ state sync bridge.
//
// Responsibilities:
//   1. On app mount: ask C++ for the persisted state blob (DAW project save)
//      via `requestInitialState`. If non-empty, hydrate the Zustand store.
//   2. After hydrate: subscribe to store changes and, debounced 200 ms, push
//      a fresh blob to C++ via `pushState`. C++ writes that blob into the
//      APVTS XML at DAW project save time.
//   3. Subscribe to push events from C++:
//        - `hostBpmChanged`  → mirror host BPM into the store (Sub-phase F
//          will read this in the TopBar; Sub-phase C just plumbs the wire).
//        - `playStateChanged` → mirror DAW transport into `isPlaying`.
//        - `currentBeatChanged` → mirror scheduler beat (no-op until D).
//        - `stateRestored`  → DAW reloaded a different preset while the
//          editor was open; re-hydrate.
//
// Re-entrancy guard: when we apply state from C++ we must NOT immediately
// push it back. `isApplyingFromNative` short-circuits the pushState path
// during the apply.

import { callNative, subscribeNative, inJuce } from '@/jucebridge'
import { useStore } from '@/lib/store'
import type { ChordEntry, Extension, Inversion, ScaleType, VoicingType } from '@/types/music'

// ── Persisted state shape (mirror of cinematic-composer's SessionData) ──
// Version field future-proofs the schema; bump when fields are added or
// renamed so older saves can migrate (Sub-phase E will use this).
interface PersistedState {
  v: number
  progression: ChordEntry[]
  root: string
  scaleType: ScaleType
  extensions: Extension[]
  tempo: number
  loop: boolean
  voicingType: VoicingType
  inversion: Inversion
  drop2: boolean
  bassNote: string | null
  activeMood: string
  moodIntensity: number
  moodRegenCounter: number
  progressionVoicing: string | null
  pianoView: 'scale' | 'chord'
  activeInstrument: string
  playbackVolume: number
  transpose: number
  selectedIndex: number | null
}

const SCHEMA_VERSION = 1

function pickPersisted(): PersistedState {
  const s = useStore.getState()
  return {
    v: SCHEMA_VERSION,
    progression: s.progression,
    root: s.root,
    scaleType: s.scaleType,
    extensions: s.extensions,
    tempo: s.tempo,
    loop: s.loop,
    voicingType: s.voicingType,
    inversion: s.inversion,
    drop2: s.drop2,
    bassNote: s.bassNote,
    activeMood: s.activeMood,
    moodIntensity: s.moodIntensity,
    moodRegenCounter: s.moodRegenCounter,
    progressionVoicing: s.progressionVoicing,
    pianoView: s.pianoView,
    activeInstrument: s.activeInstrument,
    playbackVolume: s.playbackVolume,
    transpose: s.transpose,
    selectedIndex: s.selectedIndex,
  }
}

let isApplyingFromNative = false

function applyPersisted(blob: PersistedState) {
  isApplyingFromNative = true
  try {
    useStore.setState({
      progression: Array.isArray(blob.progression) ? blob.progression : [],
      root: blob.root ?? 'C',
      scaleType: (blob.scaleType ?? 'ionian') as ScaleType,
      extensions: Array.isArray(blob.extensions) ? blob.extensions : ['triad'],
      tempo: typeof blob.tempo === 'number' ? blob.tempo : 100,
      loop: !!blob.loop,
      voicingType: (blob.voicingType ?? 'standard') as VoicingType,
      inversion: (blob.inversion ?? 'root') as Inversion,
      drop2: !!blob.drop2,
      bassNote: typeof blob.bassNote === 'string' ? blob.bassNote : null,
      activeMood: blob.activeMood ?? 'epic',
      moodIntensity: typeof blob.moodIntensity === 'number' ? blob.moodIntensity : 0.5,
      moodRegenCounter: typeof blob.moodRegenCounter === 'number' ? blob.moodRegenCounter : 0,
      progressionVoicing: typeof blob.progressionVoicing === 'string' ? blob.progressionVoicing : null,
      pianoView: blob.pianoView === 'chord' ? 'chord' : 'scale',
      activeInstrument: typeof blob.activeInstrument === 'string' ? blob.activeInstrument : 'piano',
      playbackVolume: typeof blob.playbackVolume === 'number' ? blob.playbackVolume : 80,
      transpose: typeof blob.transpose === 'number' ? blob.transpose : 0,
      selectedIndex: typeof blob.selectedIndex === 'number' ? blob.selectedIndex : null,
      // Reset history to a single restored snapshot so undo doesn't walk back
      // to whatever was in memory before the DAW reload.
      history: [Array.isArray(blob.progression) ? blob.progression : []],
      historyIndex: 0,
    })
  } finally {
    isApplyingFromNative = false
  }
}

function tryParseBlob(raw: unknown): PersistedState | null {
  if (typeof raw !== 'string' || raw.length === 0) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.progression)) {
      return parsed as PersistedState
    }
  } catch {
    // Corrupted blob — fall through to "no restore", same as fresh plugin.
  }
  return null
}

// ── Debounced push ──────────────────────────────────────────────
// 200 ms matches the budget in .ideas/plan.md § Sub-phase C. Fast enough
// that a save-and-close round-trips, slow enough to coalesce drag-storms.
const PUSH_DEBOUNCE_MS = 200

let pushTimer: number | null = null
let pendingPush = false

function schedulePush() {
  if (isApplyingFromNative) return
  pendingPush = true
  if (pushTimer != null) return
  pushTimer = window.setTimeout(async () => {
    pushTimer = null
    if (!pendingPush) return
    pendingPush = false
    try {
      const blob = JSON.stringify(pickPersisted())
      await callNative('pushState', blob)
    } catch (err) {
      console.warn('[stateSync] pushState failed', err)
    }
  }, PUSH_DEBOUNCE_MS)
}

// ── Public entry ────────────────────────────────────────────────
let initStarted = false

export async function initStateSync(): Promise<void> {
  if (initStarted) return
  initStarted = true

  // Hydrate from C++ (DAW save blob) before we start observing the store —
  // otherwise the first `setState` from applyPersisted would itself trigger
  // a push (which the guard prevents, but skipping it is cleaner).
  if (inJuce()) {
    try {
      const raw = await callNative<string>('requestInitialState')
      const blob = tryParseBlob(raw)
      if (blob) applyPersisted(blob)
    } catch (err) {
      console.warn('[stateSync] requestInitialState failed', err)
    }
  }

  // Now wire JS → C++ state push.
  useStore.subscribe(schedulePush)

  // Wire C++ → JS push events.
  subscribeNative('hostBpmChanged', (payload) => {
    const p = payload as { bpm?: number; isHostPlaying?: boolean }
    // The store doesn't have a hostBpm slot yet (Sub-phase F adds it +
    // surfaces in TopBar). For now log it so the user can verify the wire
    // is live during the Sub-phase C smoke test.
    if (typeof p?.bpm === 'number') {
      // eslint-disable-next-line no-console
      console.debug('[hostBpmChanged]', p.bpm, 'playing=', p.isHostPlaying)
    }
  })

  subscribeNative('playStateChanged', (payload) => {
    const p = payload as { isPlaying?: boolean; mode?: string }
    if (typeof p?.isPlaying === 'boolean') {
      // Don't echo back into the store — the user hits PLAY in their DAW,
      // not in our UI. Sub-phase F integrates this with the transport sync
      // mode flag. For now: log only.
      // eslint-disable-next-line no-console
      console.debug('[playStateChanged]', p.isPlaying, 'mode=', p.mode)
    }
  })

  subscribeNative('currentBeatChanged', (payload) => {
    const p = payload as { index?: number }
    if (typeof p?.index === 'number') {
      isApplyingFromNative = true
      try { useStore.setState({ currentBeat: p.index }) }
      finally { isApplyingFromNative = false }
    }
  })

  subscribeNative('stateRestored', (payload) => {
    const p = payload as { blob?: unknown }
    const blob = tryParseBlob(p?.blob)
    if (blob) applyPersisted(blob)
  })
}
