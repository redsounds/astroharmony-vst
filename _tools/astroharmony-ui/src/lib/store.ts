
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
    // App-mount entry point. In the Electron app this also did legacy
    // localStorage migration + seed-session install; in the plugin the
    // DAW state blob handles per-project restore (Sub-phase C), so all
    // we do here is hydrate the Projects dropdown.
    get().refreshSessions()
  },

  // ── Session library — Sub-phase E ───────────────────────────────
  // The Electron app used localStorage; in the plugin, every session
  // method routes through the JUCE native bridge to a SessionStore on
  // %APPDATA%\AstroHarmony\sessions\. The Zustand sessions[] /
  // activeSessionId fields act as a cache; we refresh them from C++
  // after every mutation.

  refreshSessions: () => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      try {
        const list = await callNative<SessionMeta[]>('listSessions')
        if (Array.isArray(list)) set({ sessions: list })
      } catch { /* ignore — keep stale list */ }
    })
  },

  createSession: (name) => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      const idx = get().sessions
      if (idx.length >= MAX_SESSIONS) return
      const finalName = name?.trim() || nextUntitledName(idx)
      const empty = emptySessionData()
      const meta = await callNative<SessionMeta>('saveCurrentSession', '', finalName, JSON.stringify(empty))
      if (meta && typeof meta.id === 'string') {
        get().refreshSessions()
        // Apply the empty data so the UI matches the new session.
        set({
          activeSessionId: meta.id,
          progression: [],
          root: empty.root, scaleType: empty.scaleType, extensions: empty.extensions,
          tempo: empty.tempo, loop: empty.loop,
          voicingType: empty.voicingType, inversion: empty.inversion, drop2: empty.drop2,
          activeMood: empty.activeMood, moodIntensity: empty.moodIntensity,
          progressionVoicing: empty.progressionVoicing, pianoView: empty.pianoView,
          activeInstrument: empty.activeInstrument,
          playbackVolume: empty.playbackVolume ?? 80,
          transpose: empty.transpose ?? 0,
          selectedIndex: null,
          history: [[]], historyIndex: 0,
          lastSaved: Date.now(),
        })
      }
    })
  },

  saveCurrentSession: () => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      const s = get()
      // Use the same persisted shape as pushState — the JS side has one
      // source of truth for "what to save".
      const { pickPersisted } = await import('@/lib/stateSync')
      const blob = JSON.stringify(pickPersisted())
      const meta = await callNative<SessionMeta>(
        'saveCurrentSession',
        s.activeSessionId ?? '',
        '', // empty name → reuse existing name on overwrite; auto on create
        blob,
      )
      if (meta && typeof meta.id === 'string') {
        set({ activeSessionId: meta.id, lastSaved: Date.now() })
        get().refreshSessions()
      }
    })
  },

  loadSession: (id) => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      const record = await callNative<{ id?: string; data?: unknown; error?: string }>('loadSession', id)
      if (!record || record.error || !record.data) return
      const { applyPersisted } = await import('@/lib/stateSync')
      // applyPersisted handles the field-by-field hydrate AND guards
      // against round-tripping the change back through pushState.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applyPersisted(record.data as any)
      set({ activeSessionId: id })
    })
  },

  deleteSession: (id) => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      await callNative('deleteSession', id)
      const s = get()
      // Optimistic local update; refresh confirms.
      const remaining = s.sessions.filter(m => m.id !== id)
      let nextActive: string | null = s.activeSessionId
      if (s.activeSessionId === id) {
        nextActive = remaining[0]?.id ?? null
      }
      set({ sessions: remaining, activeSessionId: nextActive })
      if (nextActive && nextActive !== s.activeSessionId) {
        get().loadSession(nextActive)
      } else if (!nextActive) {
        // No sessions left — clear in-memory progression.
        set({ progression: [], selectedIndex: null, history: [[]], historyIndex: 0 })
      }
      get().refreshSessions()
    })
  },

  renameSession: (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    // Optimistic local update.
    set((s) => ({
      sessions: s.sessions.map(m => m.id === id ? { ...m, name: trimmed, updatedAt: Date.now() } : m),
    }))
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      await callNative('renameSession', id, trimmed)
      get().refreshSessions()
    })
  },

  duplicateSession: (id) => {
    void import('@/jucebridge').then(async ({ callNative, inJuce }) => {
      if (!inJuce()) return
      const meta = await callNative<SessionMeta>('duplicateSession', id)
      if (meta && typeof meta.id === 'string') {
        get().refreshSessions()
        // Load the duplicate so the user sees it become active.
        get().loadSession(meta.id)
      }
    })
  },
}))

// ── Sessions storage helpers ─────────────────────────────────────
// In Sub-phase E, real session I/O lives in C++ (SessionStore). All the
// JS side needs are tiny helpers used by createSession: a polyphony cap
// and an "Untitled (N)" name picker. Everything else — file paths, id
// generation, JSON serialisation — happens on the C++ side.

const MAX_SESSIONS = 50

function nextUntitledName(idx: SessionMeta[]): string {
  const used = new Set(idx.map(m => m.name))
  if (!used.has('Untitled')) return 'Untitled'
  for (let i = 2; i < 999; i++) {
    const n = `Untitled ${i}`
    if (!used.has(n)) return n
  }
  return `Untitled ${Date.now()}`
}

// Default session payload — used when creating a brand-new session so the
// SessionStore writes a valid, fully-shaped initial state to disk.
function emptySessionData() {
  return {
    v: 2,
    progression: [],
    root: 'C',
    scaleType: 'ionian' as ScaleType,
    extensions: ['triad'] as Extension[],
    tempo: 100,
    loop: false,
    voicingType: 'standard' as VoicingType,
    inversion: 'root' as Inversion,
    drop2: false,
    activeMood: 'epic',
    moodIntensity: 0.5,
    progressionVoicing: null as string | null,
    pianoView: 'scale' as 'scale' | 'chord',
    activeInstrument: 'piano',
    playbackVolume: 80,
    transpose: 0,
  }
}
