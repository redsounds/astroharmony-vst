# AstroHarmony — Creative Brief

## Hook
**AstroHarmony in your DAW.** The mood-driven chord composition workstation — Epic, Dark, Hopeful, Tension, Mystery, Fantasy, Adventure, Love, Horror, Sad — now lives inside your sessions as a VST3 instrument plugin. Pick a mood, get curated chord suggestions, audition with sampled instruments, drag-reorder progressions, export MIDI. No tab-switching, no browser, no localStorage.

## Vision
This is a **1:1 port** of the existing AstroHarmony Electron desktop app (`D:\Claude\Sessions\cinematic-composer`) into a VST3/Standalone audio plugin built on JUCE 8 + WebView2. Every visible feature from the desktop app must work identically inside a DAW window.

The architecture proven by SimpleGain (JUCE 8 WebView host + parameter relays + native function bridge) plus the Phase 0 spike (Vite + React 19 + Zustand + @dnd-kit + vite-plugin-singlefile = single-HTML bundle) gives us the technical foundation. This phase fleshes out the *full* product.

## Source of Truth
Everything functional in this plugin is mirrored from these source modules of the Electron app — they are **read-only references**; we never modify them:

| Source path (in cinematic-composer) | Role | Ported via |
|---|---|---|
| `lib/theory.ts` (697 lines) | Music theory engine (scales, chords, voicings) | Pure TS → bundled into WebView |
| `lib/voicings.ts` (477 lines) | Voicing algorithms (inversion, drop2, bass override) | Pure TS → bundled |
| `lib/moodEngine/*` (~3,000 lines, 10 mood files + suggester + transforms) | Mood-driven chord suggestion brain | Pure TS → bundled |
| `lib/midi.ts` (197 lines) | MIDI file generation | Pure TS → bundled; file-save via JUCE FileChooser |
| `lib/audio.ts` (Tone.js) | Sampler playback | **Replaced** with C++ JUCE Synthesiser + Sampler voices |
| `lib/instruments.ts` + `public/samples/` (3 MB, 4 instruments) | Salamander Piano, Flute, Strings (VSCO 2), Trumpet | mp3 samples embedded as BinaryData |
| `lib/store.ts` (873 lines, Zustand) | App state | Ported; session storage moves from localStorage → file-based (`%APPDATA%\AstroHarmony\sessions\*.json`) |
| `types/music.ts` | Type definitions | Pure TS → bundled |
| `components/v2/*.tsx` (~2,200 lines, 14 components) | All UI | Ported with @dnd-kit, hooked to plugin state |

## Detailed Behavior (the v1 1:1 scope)

### Layout (matches screenshot)
- **Header (top bar):** Projects dropdown · Save icon · Undo · Redo · Center brand "ASTROHARMONY" · Instrument picker (4 instruments) · Play · Stop · Loop · BPM display · Volume slider · Settings gear
- **Left sidebar:** 10 mood buttons (Epic 👑 / Dark / Hopeful / Sad / Tension / Mystery / Fantasy / Adventure / Love / Horror) each with description tagline
- **Main workspace center:**
  - Project title (editable) + bars-count + CLEAR button
  - Progression grid of ChordCards with transition labels ("1 to 2"), per-chord scale tag, per-chord bar count, DnD reorder, delete-on-hover
  - Progress bar showing playback position (gradient cyan → pink)
  - SUGGESTED NEXT CHORDS row (6 named pattern suggestions from active mood: "Triumphant Open", "Breeding Anchor", "Heroic Tonic", "Ominous Pedal", "Modal Foundation", "Battle Drone" — names vary per mood)
  - Scale/Mode section: Root select · Mode select · Mood-preferred-modes hint row ("Epic prefers: Ionian, Mixolydian, Aeolian")
  - Extensions toggle: Triad / 6&7 / 9 / 11 / 13 (multi-select per current behavior)
  - Diatonic chord grid: all selected extensions rendered as separate labeled rows (Triads, 13th chords, sus2, sus2+13, sus4, sus4+13)
- **Right sidebar:**
  - PROGRESSION STYLE dropdown (preset voicing styles) + refresh
  - SCALE NOTES section with SCALE / CHORD toggle, mini-piano visualization
  - BASS NOTE editor (per-chord override picker — "select a chord to edit")
- **Footer (bottom bar):** PITCH slider (-12..+12) · EXPORT MIDI button

### Audio engine (C++ side)
- JUCE `Synthesiser` with 8-voice polyphony
- `Sampler` voices loading the 4 bundled instrument sample sets (Salamander Piano, Flute, Strings, Trumpet)
- Per-instrument envelope (attack/release from `instruments.ts`)
- Light reverb (`juce::dsp::Reverb`) for cinematic feel
- Chord triggering driven by JS bridge events: `playChord(notes)`, `playProgression(...)`, `stopAll()`

### Transport
- **Host-synced when DAW is playing** — read `AudioPlayHead`, lock progression scheduler to host BPM and bar position
- **Standalone when DAW is stopped** — internal scheduler at user-set tempo (40–200 BPM slider)
- UI shows mode indicator ("Synced to host" vs "Standalone")

### State persistence
- **Host-automatable APVTS params:** tempo, master_volume, pitch_transpose, loop, bypass
- **Custom state blob** (XML via `getStateInformation`): activeMood, moodIntensity, activeInstrument, root, scaleType, extensions[], inversion, drop2, bassNote, voicingType, progressionVoicing, progression[], pianoView, activeSessionId, sessions[]
- **File-based session library:** `%APPDATA%\AstroHarmony\sessions\*.json` for multi-project save/load (replaces localStorage)

### MIDI export
- "EXPORT MIDI" button → JUCE `FileChooser` save dialog → write `.mid` file at user-selected path using the existing `lib/midi.ts` generator (ported as-is)

## Aesthetic
**1:1 with the Electron app:**
- Color tokens: cream `#f5efe7` background (or DAW-dark variant tbd), cyan `#5ec5c1` brand, pink `#f4a8b8` accent, purple `#6b5b8a` secondary, dark `#2a1f3d` modal. Looking at the screenshot the running app uses a DARK theme (`#1a1825`-ish background) — port that.
- Typography: Fraunces (serif) for logo/chord names/section labels; DM Sans for body — bundled inline via Vite (no Google Fonts CDN inside a plugin)
- Shadow + radius system from `globals.css`

## Out of Scope (deliberate, v1)
- **License Gate** — deferred per user decision. Plugin opens immediately, no key required. Add in v1.1 if needed.
- **Cloud / community features** — none. No supabase, no `/community`, no `/learn`.
- **Multi-window / popouts** — single plugin editor window.
- **MIDI input** — the plugin generates audio + MIDI; it doesn't *receive* MIDI from the DAW track to drive chord triggering. (Could revisit in v2.)
- **DAW-specific quirks** (e.g. FL Studio piano roll integration) — generic VST3/AU/Standalone behavior only.

## Success Criteria (v1)
- Loads in Reaper, FL Studio, and Ableton Live (Windows) without crash
- Bundle ≤ 15 MB
- Every visible UI element from the Electron screenshot renders and is interactive in the plugin window
- Pick mood → suggestions update; pick chord → audible preview via sampled instrument; build progression → play with loop; export to MIDI file; reload DAW project → all state restored
- Host transport sync: tempo and bar position lock when DAW plays
- A/B comparison test: same chord progression in plugin and Electron app sounds *recognizably similar* (same samples, same envelopes, same voicing logic)
