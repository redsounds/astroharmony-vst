
import { create } from 'zustand'
import type { ChordEntry, Extension, Inversion, ScaleType, VoicingType, Duration } from '@/types/music'
import { getVoicedNotes } from '@/lib/audio'
import { getMood } from '@/lib/moodEngine'

export interface SessionMeta {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  chordCount: number
  bars: number
}

interface AppState {
  root: string
  scaleType: ScaleType
  extensions: Extension[]

  progression: ChordEntry[]
  selectedIndex: number | null

  inversion: Inversion
  drop2: boolean
  bassNote: string | null
  voicingType: VoicingType

  isPlaying: boolean
  tempo: number
  /** Playback-only transpose in semitones (-12..+12). Does not change
   *  chord.notes — shifts audio + MIDI export only. */
  transpose: number
  /** Master playback volume 0-100. Saved with session. */
  playbackVolume: number
  loop: boolean
  currentBeat: number
  previewNotes: string[] | null
  previewVoicedNotes: string[] | null
  pinnedChordNotes: string[] | null
  pinnedVoicedNotes: string[] | null
  pianoView: 'scale' | 'chord'

  history: ChordEntry[][]
  historyIndex: number

  setRoot: (root: string) => void
  setScaleType: (type: ScaleType) => void
  toggleExtension: (ext: Extension) => void
  setInversion: (inv: Inversion) => void
  toggleDrop2: () => void
  setBassNote: (note: string | null) => void
  setTempo: (bpm: number) => void
  setTranspose: (semis: number) => void
  setPlaybackVolume: (percent: number) => void
  toggleLoop: () => void
  setPlaying: (v: boolean) => void
  setCurrentBeat: (beat: number) => void
  setSelectedIndex: (i: number | null) => void
  setPreviewNotes: (notes: string[] | null, voiced?: string[] | null) => void
  setPinnedChordNotes: (notes: string[] | null, voiced?: string[] | null) => void
  setPianoView: (v: 'scale' | 'chord') => void

  addChord: (chord: ChordEntry) => void
  removeChord: (index: number) => void
  clearProgression: () => void
  reorderChords: (from: number, to: number) => void
  updateChordBassNote: (index: number, note: string) => void
  updateChordInversion: (index: number, inv: Inversion) => void
  updateChordDrop2: (index: number, drop2: boolean) => void
  updateChordDuration: (index: number) => void
  updateChordBars: (index: number, bars: number) => void
  updateChordVoicingType: (index: number, vt: VoicingType) => void
  setVoicingType: (vt: VoicingType) => void
  undo: () => void
  redo: () => void

  lastSaved: number | null
  saveProgression: () => void
  loadProgression: () => void

  // ── Sessions / presets ────────────────────────────────────────
  sessions: SessionMeta[]
  activeSessionId: string | null
  refreshSessions: () => void
  createSession: (name?: string) => void
  saveCurrentSession: () => void
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  duplicateSession: (id: string) => void

  // Mood engine state
  activeMood: string
  moodIntensity: number
  moodRegenCounter: number
  setActiveMood: (id: string) => void
  setMoodIntensity: (n: number) => void
  bumpMoodRegen: () => void

  // Active instrument (sampler) — drives audio playback
  activeInstrument: string
  setActiveInstrument: (id: string) => void

  // Progression-level voicing style
  progressionVoicing: string | null
  setProgressionVoicing: (style: string) => void
  reshuffleVoicing: () => void
  /** Change variant of a single chord (0-3 cycle). */
  cycleChordVariant: (index: number, delta: 1 | -1) => void
}

function computePinned(chord: ChordEntry) {
  const bass = chord.bassNote ?? chord.notes[0]
  const voiced = getVoicedNotes(
    chord.notes,
    chord.inversion ?? 'root',
    chord.drop2 ?? false,
    bass,
    chord.voicingType ?? 'standard',
    chord.voicingVariant ?? 0,
  )
  const pitchClasses = voiced.map(n => n.replace(/\d+$/, ''))
  // Also clear any stale preview overlay so the freshly-edited voicing /
  // bass note shows up immediately. previewNotes have priority in the
  // RightPanel render and would otherwise hide the update until the
  // 1.4 s preview timer fires.
  return {
    pinnedChordNotes: pitchClasses,
    pinnedVoicedNotes: voiced,
    bassNote: bass,
    previewNotes: null,
    previewVoicedNotes: null,
  }
}

function pushHistory(state: AppState, newProg: ChordEntry[]): Partial<AppState> {
  const trimmed = state.history.slice(0, state.historyIndex + 1)
  return {
    progression: newProg,
    history: [...trimmed, newProg],
    historyIndex: trimmed.length,
  }
}

export const useStore = create<AppState>((set, get) => ({
  root: 'C',
  scaleType: 'ionian',
  extensions: ['triad'],

  progression: [],
  selectedIndex: null,

  inversion: 'root',
  drop2: false,
  bassNote: null,
  voicingType: 'standard',

  isPlaying: false,
  tempo: 100,
  transpose: 0,
  playbackVolume: 80,
  loop: false,
  currentBeat: -1,
  previewNotes: null,
  previewVoicedNotes: null,
  pinnedChordNotes: null,
  pinnedVoicedNotes: null,
  pianoView: 'scale',

  history: [[]],
  historyIndex: 0,

  lastSaved: null,
  sessions: [],
  activeSessionId: null,

  activeMood: 'epic',
  moodIntensity: 0.5,
  moodRegenCounter: 0,
  setActiveMood: (activeMood) => set((s) => {
    // Auto-switch scale to one preferred by the new mood (unless the
    // current scale is already preferred) AND auto-activate the mood's
    // progression voicing style so every existing + future chord
    // immediately sounds in the right character.
    let nextScale = s.scaleType
    let nextRoot = s.root
    let nextVoicing: string | null = s.progressionVoicing
    let newProg = s.progression
    {
      const def = getMood(activeMood)
      if (def) {
        // Always snap to the mood's first preferred mode so switching away
        // and back lands in the same key. Otherwise a mode that happens to
        // be later in the list (e.g. Aeolian for Epic) would stick around
        // and the mood would feel "wrong" on re-selection.
        if (def.preferredModes.length > 0) {
          nextScale = def.preferredModes[0] as typeof s.scaleType
        }
        // Each mood has a historically/cinematically idiomatic key (e.g.
        // Epic → E♭ for Star Wars heroism, Sad → A minor). Apply it so the
        // suggestions sound in that voice; user can override via the root
        // selector.
        if (def.preferredRoot) {
          nextRoot = def.preferredRoot
        }
        if (def.defaultVoicing) {
          nextVoicing = def.defaultVoicing
          // Re-voice every existing chord so the change is audible /
          // visible immediately, not only on subsequent additions.
          newProg = s.progression.map((c, i) => ({
            ...c,
            voicingType: def.defaultVoicing as typeof c.voicingType,
            voicingVariant: i % 4,
          }))
        }
      }
    }
    return {
      activeMood,
      moodRegenCounter: 0,
      root: nextRoot,
      scaleType: nextScale,
      progressionVoicing: nextVoicing,
      progression: newProg,
    }
  }),
  setMoodIntensity: (moodIntensity) => set({ moodIntensity: Math.max(0, Math.min(1, moodIntensity)) }),
  bumpMoodRegen: () => set((s) => ({ moodRegenCounter: s.moodRegenCounter + 1 })),

  activeInstrument: 'piano',
  setActiveInstrument: (id) => {
    set({ activeInstrument: id })
    // Fire-and-forget; the sampler cache loads samples in the background.
    void import('@/lib/audio').then(m => m.setActiveInstrument(id))
  },

  progressionVoicing: null,
  setProgressionVoicing: (style) => set((s) => {
    const newProg = s.progression.map((c, i) => ({
      ...c,
      voicingType: style as typeof c.voicingType,
      voicingVariant: i % 4,
    }))
    return {
      progressionVoicing: style,
      progression: newProg,
      history: [...s.history.slice(0, s.historyIndex + 1), newProg],
      historyIndex: s.historyIndex + 1,
    }
  }),
  cycleChordVariant: (index, delta) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const next = ((((chord.voicingVariant ?? 0) + delta) % 4) + 4) % 4
    const updated = { ...chord, voicingVariant: next }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return { ...pushHistory(s, newProg), ...computePinned(updated) }
  }),
  reshuffleVoicing: () => set((s) => {
    const newProg = s.progression.map((c) => ({
      ...c,
      voicingVariant: (((c.voicingVariant ?? 0) + 1) % 4),
    }))
    return {
      progression: newProg,
      history: [...s.history.slice(0, s.historyIndex + 1), newProg],
      historyIndex: s.historyIndex + 1,
    }
  }),

  setRoot: (root) => set({ root }),
  setScaleType: (scaleType) => set({ scaleType }),
  toggleExtension: (ext) => set((s) => {
    const active = s.extensions
    if (active.includes(ext)) {
      const next = active.filter(e => e !== ext)
      return { extensions: next.length ? next : active }
    }
    return { extensions: [...active, ext] }
  }),
  setInversion: (inversion) => set({ inversion }),
  toggleDrop2: () => set((s) => ({ drop2: !s.drop2 })),
  setBassNote: (bassNote) => set({ bassNote }),
  setTempo: (tempo) => {
    set({ tempo })
    import('./audio').then(m => m.setTempo(tempo)).catch(() => {})
  },
  setTranspose: (semis) => {
    const clamped = Math.max(-12, Math.min(12, Math.round(semis)))
    set({ transpose: clamped })
    // Reflect into the audio layer so the next playChord / playProgression
    // call picks it up without the UI threading the value through.
    import('./audio').then(m => m.setPlaybackTranspose(clamped)).catch(() => {})
  },
  setPlaybackVolume: (percent) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)))
    set({ playbackVolume: clamped })
    import('./audio').then(m => m.setMasterVolume(clamped)).catch(() => {})
  },
  toggleLoop: () => set((s) => {
    const loop = !s.loop
    import('./audio').then(m => m.setLoop(loop)).catch(() => {})
    return { loop }
  }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setSelectedIndex: (selectedIndex) => set((s) => {
    const chord = selectedIndex !== null ? s.progression[selectedIndex] : null
    if (!chord) return { selectedIndex, bassNote: null, pinnedChordNotes: null, pinnedVoicedNotes: null }
    return {
      selectedIndex,
      inversion: chord.inversion ?? s.inversion,
      drop2: chord.drop2 ?? s.drop2,
      voicingType: chord.voicingType ?? s.voicingType,
      ...computePinned(chord),
    }
  }),
  setPreviewNotes: (previewNotes, voiced) => set({ previewNotes, previewVoicedNotes: voiced ?? null }),
  setPinnedChordNotes: (pinnedChordNotes, voiced) => set({ pinnedChordNotes, pinnedVoicedNotes: voiced ?? null }),
  setPianoView: (pianoView) => set({ pianoView }),

  addChord: (chord) => {
    const s = get()
    // If a progression-wide voicing is active, every newly added chord
    // should inherit it (so the chord picker, suggestions, and existing
    // progression all sound the same style). Each new chord gets the
    // next variant in rotation so the style breathes across the bars.
    const vt = (s.progressionVoicing ?? chord.voicingType ?? s.voicingType) as ChordEntry['voicingType']
    const variant = s.progressionVoicing
      ? s.progression.length % 4
      : (chord.voicingVariant ?? 0)
    const entry: ChordEntry = {
      ...chord,
      bassNote: chord.bassNote ?? chord.notes[0],
      inversion: chord.inversion ?? s.inversion,
      drop2: chord.drop2 ?? s.drop2,
      voicingType: vt,
      voicingVariant: variant,
      colorIndex: chord.colorIndex ?? (s.progression.length % 6),
    }
    const newProg = [...s.progression, entry]
    const newIndex = newProg.length - 1
    set({ ...pushHistory(s, newProg), selectedIndex: newIndex, bassNote: entry.bassNote ?? null, pianoView: 'chord' })
  },

  updateChordBassNote: (index, note) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const updated = { ...chord, bassNote: note }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return { ...pushHistory(s, newProg), ...computePinned(updated) }
  }),

  updateChordInversion: (index, inv) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const updated = { ...chord, inversion: inv }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return { ...pushHistory(s, newProg), inversion: inv, ...computePinned(updated) }
  }),

  updateChordDrop2: (index, drop2) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const updated = { ...chord, drop2 }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return { ...pushHistory(s, newProg), drop2, ...computePinned(updated) }
  }),

  updateChordDuration: (index) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const next: Duration = (chord.duration ?? '1') === '1' ? '2' : '1'
    const updated = { ...chord, duration: next }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return pushHistory(s, newProg)
  }),

  updateChordBars: (index, bars) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    // Clamp to [0.5, 16] and snap to 0.5 step
    const clean = Math.max(0.5, Math.min(16, Math.round(bars * 2) / 2))
    const updated = { ...chord, bars: clean }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return pushHistory(s, newProg)
  }),

  updateChordVoicingType: (index, vt) => set((s) => {
    const chord = s.progression[index]
    if (!chord) return {}
    const updated = { ...chord, voicingType: vt }
    const newProg = s.progression.map((c, i) => i === index ? updated : c)
    return { ...pushHistory(s, newProg), voicingType: vt, ...computePinned(updated) }
  }),

  setVoicingType: (voicingType) => set({ voicingType }),

  removeChord: (index) => {
    const s = get()
    const newProg = s.progression.filter((_, i) => i !== index)
    set(pushHistory(s, newProg))
  },

  clearProgression: () => {
    const s = get()
    if (s.progression.length === 0) return
    set({ ...pushHistory(s, []), selectedIndex: null, currentBeat: -1 })
  },

  reorderChords: (from, to) => {
    const s = get()
    const newProg = [...s.progression]
    const [moved] = newProg.splice(from, 1)
    newProg.splice(to, 0, moved)
    set(pushHistory(s, newProg))
  },

  undo: () => {
    const s = get()
    if (s.historyIndex <= 0) return
    const newIndex = s.historyIndex - 1
    set({ progression: s.history[newIndex], historyIndex: newIndex })
  },

  redo: () => {
    const s = get()
    if (s.historyIndex >= s.history.length - 1) return
    const newIndex = s.historyIndex + 1
    set({ progression: s.history[newIndex], historyIndex: newIndex })
  },

  saveProgression: () => {
    get().saveCurrentSession()
  },

  loadProgression: () => {
    const s = get()
    s.refreshSessions()
    const activeId = readActiveId()
    if (activeId && readSession(activeId)) {
      get().loadSession(activeId)
    } else {
      // Legacy: migrate the old single-slot cc_state_v2 into a real session.
      tryMigrateLegacy(get(), set)
      // Still nothing? Seed bundled starter sessions (first-launch only).
      if (readIndex().length === 0) {
        trySeedStarterSessions(set)
      }
    }
    // Top up any seed presets that didn't exist last time the user launched
    // (e.g. user upgraded the .exe and new seeds shipped with it).
    tryTopUpSeeds(set)
  },

  refreshSessions: () => {
    set({ sessions: readIndex() })
  },

  createSession: (name) => {
    const idx = readIndex()
    if (idx.length >= MAX_SESSIONS) {
      // Caller (UI) should warn user — store stays silent.
      return
    }
    const id = makeId()
    const finalName = name?.trim() || nextUntitledName(idx)
    const now = Date.now()
    const meta: SessionMeta = { id, name: finalName, createdAt: now, updatedAt: now, chordCount: 0, bars: 0 }
    const empty: ChordEntry[] = []
    writeSession(id, emptySessionData())
    writeIndex([...idx, meta])
    writeActiveId(id)
    set({
      sessions: [...idx, meta],
      activeSessionId: id,
      progression: empty,
      selectedIndex: null,
      history: [empty],
      historyIndex: 0,
      lastSaved: now,
    })
  },

  saveCurrentSession: () => {
    const s = get()
    let activeId = s.activeSessionId
    let idx = s.sessions.length ? s.sessions : readIndex()
    // If no active session yet, create one implicitly so Save always works.
    if (!activeId) {
      if (idx.length >= MAX_SESSIONS) return
      activeId = makeId()
      const name = nextUntitledName(idx)
      const now = Date.now()
      const meta: SessionMeta = { id: activeId, name, createdAt: now, updatedAt: now, chordCount: 0, bars: 0 }
      idx = [...idx, meta]
    }
    const data = pickSessionData(s)
    writeSession(activeId, data)
    const updatedIdx = idx.map(m => m.id === activeId
      ? { ...m, updatedAt: Date.now(), chordCount: data.progression.length, bars: computeBars(data.progression) }
      : m,
    )
    writeIndex(updatedIdx)
    writeActiveId(activeId)
    set({ sessions: updatedIdx, activeSessionId: activeId, lastSaved: Date.now() })
  },

  loadSession: (id) => {
    const d = readSession(id)
    if (!d) return
    writeActiveId(id)
    set({
      activeSessionId: id,
      progression: d.progression,
      root: d.root ?? 'C',
      scaleType: d.scaleType ?? 'ionian',
      extensions: Array.isArray(d.extensions) ? d.extensions : ['triad'],
      tempo: d.tempo ?? 100,
      loop: !!d.loop,
      voicingType: d.voicingType ?? 'standard',
      inversion: d.inversion ?? 'root',
      drop2: !!d.drop2,
      activeMood: d.activeMood ?? 'epic',
      moodIntensity: typeof d.moodIntensity === 'number' ? d.moodIntensity : 0.5,
      progressionVoicing: d.progressionVoicing ?? null,
      pianoView: d.pianoView === 'chord' ? 'chord' : 'scale',
      activeInstrument: typeof d.activeInstrument === 'string' ? d.activeInstrument : 'piano',
      playbackVolume: typeof d.playbackVolume === 'number' ? d.playbackVolume : 80,
      transpose: typeof d.transpose === 'number' ? d.transpose : 0,
      history: [d.progression],
      historyIndex: 0,
      selectedIndex: null,
    })
    // Sync the audio engine to the restored instrument, volume and pitch
    // so playback resumes exactly how the session was saved.
    void import('@/lib/audio').then(m => {
      m.setActiveInstrument(typeof d.activeInstrument === 'string' ? d.activeInstrument : 'piano')
      m.setMasterVolume(typeof d.playbackVolume === 'number' ? d.playbackVolume : 80)
      m.setPlaybackTranspose(typeof d.transpose === 'number' ? d.transpose : 0)
    })
  },

  deleteSession: (id) => {
    const idx = readIndex().filter(m => m.id !== id)
    writeIndex(idx)
    try { localStorage.removeItem(sessionKey(id)) } catch {}
    const s = get()
    let nextActive: string | null = s.activeSessionId
    if (s.activeSessionId === id) {
      nextActive = idx[0]?.id ?? null
      writeActiveId(nextActive)
      if (nextActive) get().loadSession(nextActive)
      else {
        // No sessions left — clear in-memory progression.
        set({
          progression: [],
          selectedIndex: null,
          history: [[]],
          historyIndex: 0,
          activeSessionId: null,
        })
      }
    }
    set({ sessions: idx, activeSessionId: nextActive })
  },

  renameSession: (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const idx = readIndex().map(m => m.id === id ? { ...m, name: trimmed, updatedAt: Date.now() } : m)
    writeIndex(idx)
    set({ sessions: idx })
  },

  duplicateSession: (id) => {
    const idx = readIndex()
    if (idx.length >= MAX_SESSIONS) return
    const src = idx.find(m => m.id === id)
    const data = readSession(id)
    if (!src || !data) return
    const newId = makeId()
    const now = Date.now()
    const copyName = `${src.name} (copy)`
    const meta: SessionMeta = {
      id: newId, name: copyName,
      createdAt: now, updatedAt: now,
      chordCount: src.chordCount, bars: src.bars,
    }
    writeSession(newId, data)
    const nextIdx = [...idx, meta]
    writeIndex(nextIdx)
    writeActiveId(newId)
    set({ sessions: nextIdx, activeSessionId: newId })
    get().loadSession(newId)
  },
}))

// ── Sessions storage helpers ─────────────────────────────────────
const MAX_SESSIONS = 50
const SESSIONS_INDEX_KEY = 'cc_sessions_index'
const ACTIVE_ID_KEY = 'cc_active_id'
const LEGACY_SINGLE_KEY = 'cc_state_v2'

function sessionKey(id: string): string { return `cc_session_${id}` }

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function nextUntitledName(idx: SessionMeta[]): string {
  const used = new Set(idx.map(m => m.name))
  if (!used.has('Untitled')) return 'Untitled'
  for (let i = 2; i < 999; i++) {
    const n = `Untitled ${i}`
    if (!used.has(n)) return n
  }
  return `Untitled ${Date.now()}`
}

function readIndex(): SessionMeta[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSIONS_INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function writeIndex(idx: SessionMeta[]) {
  try { localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(idx)) } catch {}
}

function readActiveId(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem(ACTIVE_ID_KEY) } catch { return null }
}

function writeActiveId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id)
    else localStorage.removeItem(ACTIVE_ID_KEY)
  } catch {}
}

interface SessionData {
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
  activeMood: string
  moodIntensity: number
  progressionVoicing: string | null
  pianoView: 'scale' | 'chord'
  activeInstrument: string
  /** Master playback volume 0-100 (percent of slider). */
  playbackVolume?: number
  /** Playback-only pitch shift in semitones (-12..+12). */
  transpose?: number
}

function readSession(id: string): SessionData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(sessionKey(id))
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function writeSession(id: string, data: SessionData) {
  try { localStorage.setItem(sessionKey(id), JSON.stringify(data)) } catch {}
}

function pickSessionData(s: AppState): SessionData {
  return {
    v: 2,
    progression: s.progression,
    root: s.root,
    scaleType: s.scaleType,
    extensions: s.extensions,
    tempo: s.tempo,
    loop: s.loop,
    voicingType: s.voicingType,
    inversion: s.inversion,
    drop2: s.drop2,
    activeMood: s.activeMood,
    moodIntensity: s.moodIntensity,
    progressionVoicing: s.progressionVoicing,
    pianoView: s.pianoView,
    activeInstrument: s.activeInstrument,
    playbackVolume: s.playbackVolume,
    transpose: s.transpose,
  }
}

function emptySessionData(): SessionData {
  return {
    v: 2,
    progression: [],
    root: 'C',
    scaleType: 'ionian',
    extensions: ['triad'],
    tempo: 100,
    loop: false,
    voicingType: 'standard',
    inversion: 'root',
    drop2: false,
    activeMood: 'epic',
    moodIntensity: 0.5,
    progressionVoicing: null,
    pianoView: 'scale',
    activeInstrument: 'piano',
    playbackVolume: 80,
    transpose: 0,
  }
}

function computeBars(progression: ChordEntry[]): number {
  return progression.reduce((sum, c) => sum + (c.bars ?? 1), 0)
}

/**
 * Drop the bundled `seed-sessions.json` presets into localStorage on the
 * very first launch (empty session index, no legacy data to migrate).
 *
 * Once seeded, the user can edit, duplicate, rename, or delete them like
 * any other session — they're not "templates", they're plain starter
 * projects. Subsequent launches see a non-empty index and skip seeding.
 */
function trySeedStarterSessions(set: (partial: Partial<AppState>) => void) {
  if (typeof window === 'undefined') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seeds = require('./seed-sessions.json') as Array<{ name: string; data: Partial<SessionData> }>
    if (!Array.isArray(seeds) || seeds.length === 0) return
    const now = Date.now()
    const metas: SessionMeta[] = []
    let firstId: string | null = null
    let firstData: SessionData | null = null
    for (const seed of seeds) {
      const id = makeId()
      const data: SessionData = { ...emptySessionData(), ...seed.data, v: 2 }
      const meta: SessionMeta = {
        id, name: seed.name,
        createdAt: now, updatedAt: now,
        chordCount: data.progression.length, bars: computeBars(data.progression),
      }
      writeSession(id, data)
      metas.push(meta)
      if (!firstId) { firstId = id; firstData = data }
    }
    writeIndex(metas)
    if (firstId && firstData) {
      writeActiveId(firstId)
      set({
        sessions: metas,
        activeSessionId: firstId,
        progression: firstData.progression,
        root: firstData.root,
        scaleType: firstData.scaleType,
        extensions: firstData.extensions,
        tempo: firstData.tempo,
        loop: firstData.loop,
        voicingType: firstData.voicingType,
        inversion: firstData.inversion,
        drop2: firstData.drop2,
        activeMood: firstData.activeMood,
        moodIntensity: firstData.moodIntensity,
        progressionVoicing: firstData.progressionVoicing,
        pianoView: firstData.pianoView,
        activeInstrument: firstData.activeInstrument,
        history: [firstData.progression],
        historyIndex: 0,
        lastSaved: now,
      })
    }
  } catch {}
}

/**
 * After first-launch seeding is done, top up any seeds the user is missing.
 * Tracks which seed names have already been planted in localStorage so we
 * never re-add a seed the user explicitly deleted, and never duplicate one
 * they still have. New presets shipped in later builds land automatically.
 */
const SEEDED_NAMES_KEY = 'cc_seeded_names'
function tryTopUpSeeds(set: (partial: Partial<AppState>) => void) {
  if (typeof window === 'undefined') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const seeds = require('./seed-sessions.json') as Array<{ name: string; data: Partial<SessionData> }>
    if (!Array.isArray(seeds) || seeds.length === 0) return
    let seeded: string[] = []
    try { seeded = JSON.parse(localStorage.getItem(SEEDED_NAMES_KEY) || '[]') } catch {}
    // If the marker is empty but the user already has sessions, assume any
    // seed whose name matches an existing session is "already planted" so we
    // don't duplicate the original 3 starter presets.
    const idx = readIndex()
    if (seeded.length === 0 && idx.length > 0) {
      seeded = seeds.filter(s => idx.some(m => m.name === s.name)).map(s => s.name)
    }
    const seededSet = new Set(seeded)
    const missing = seeds.filter(s => !seededSet.has(s.name))
    if (missing.length === 0) {
      // Persist the inferred marker so future launches skip the inference.
      if (seeded.length > 0) localStorage.setItem(SEEDED_NAMES_KEY, JSON.stringify(seeded))
      return
    }
    const now = Date.now()
    const newMetas: SessionMeta[] = []
    for (const seed of missing) {
      const id = makeId()
      const data: SessionData = { ...emptySessionData(), ...seed.data, v: 2 }
      const meta: SessionMeta = {
        id, name: seed.name,
        createdAt: now, updatedAt: now,
        chordCount: data.progression.length, bars: computeBars(data.progression),
      }
      writeSession(id, data)
      newMetas.push(meta)
      seededSet.add(seed.name)
    }
    writeIndex([...idx, ...newMetas])
    localStorage.setItem(SEEDED_NAMES_KEY, JSON.stringify([...seededSet]))
    set({ sessions: readIndex() })
  } catch {}
}

function tryMigrateLegacy(s: AppState, set: (partial: Partial<AppState>) => void) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LEGACY_SINGLE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (!Array.isArray(d.progression)) return
    const id = makeId()
    const now = Date.now()
    const data: SessionData = { ...emptySessionData(), ...d, v: 2 }
    const meta: SessionMeta = {
      id, name: 'Untitled',
      createdAt: now, updatedAt: now,
      chordCount: data.progression.length, bars: computeBars(data.progression),
    }
    writeSession(id, data)
    writeIndex([meta])
    writeActiveId(id)
    localStorage.removeItem(LEGACY_SINGLE_KEY)
    set({
      sessions: [meta],
      activeSessionId: id,
      progression: data.progression,
      root: data.root,
      scaleType: data.scaleType,
      extensions: data.extensions,
      tempo: data.tempo,
      loop: data.loop,
      voicingType: data.voicingType,
      inversion: data.inversion,
      drop2: data.drop2,
      activeMood: data.activeMood,
      moodIntensity: data.moodIntensity,
      progressionVoicing: data.progressionVoicing,
      pianoView: data.pianoView,
      history: [data.progression],
      historyIndex: 0,
      lastSaved: now,
    })
  } catch {}
}
