# AstroHarmony — Parameter & State Specification

> AstroHarmony's "controls" split into three buckets: **host-automatable VST parameters** (APVTS), **persisted custom state** (XML blob via `getStateInformation`), and **read-only UI feedback** (events C++ → JS via timer or processing thread). This split is critical for plugin behavior — a DAW should be able to automate tempo and volume, but it makes no sense to "automate" which mood is selected mid-playback.

---

## 1. Host-automatable parameters (APVTS)

These appear in the DAW's parameter list and can be automated, mapped to a controller, or recorded.

| ID | Display Name | Type | Range | Default | Unit | Skew | Smoothing |
|---|---|---|---|---|---|---|---|
| `tempo` | Tempo | Float | 40.0 – 200.0 | 100.0 | BPM | linear | n/a (transport-level) |
| `master_volume` | Master Volume | Float | 0.0 – 100.0 | 80.0 | % | linear (perceptual maps to dB inside) | 20 ms |
| `pitch_transpose` | Pitch Transpose | Float | -12.0 – +12.0 | 0.0 | semitones | linear | 50 ms |
| `loop` | Loop | Bool | false / true | false | — | n/a | n/a |
| `bypass` | Bypass | Bool | false / true | false | — | n/a | host-handled |

### Notes
- `tempo` is overridden by host BPM when `AudioPlayHead::isPlaying()` is true (transport-sync mode). When standalone, the param drives the scheduler directly.
- `master_volume` is the post-reverb output trim. UI knob maps 0–100 % linear; internally converts to dB (`gainFactor = (vol/100)^2` for perceptual taper).
- `pitch_transpose` shifts audio + MIDI export only — does NOT mutate `chord.notes` in the state.
- `bypass` is host-handled via `AudioProcessor::getBypassParameter()` — sample-accurate.

---

## 2. Persisted custom state (XML blob)

Survives DAW save/reload via `getStateInformation` / `setStateInformation`. **NOT** host-automatable — these change UI mode, not audio in a way that DAW automation would make sense for.

### 2a. Scale / mode context
| Key | Type | Values | Default |
|---|---|---|---|
| `root` | string (note name) | C, C#, D, D#, E, F, F#, G, G#, A, A#, B | "C" |
| `scale_type` | enum | 21 modes (Ionian family 7 + Harmonic Minor family 7 + Melodic Minor family 7) — see `types/music.ts` `ScaleType` union | "major" |
| `extensions` | string[] | subset of ["triad", "7", "9", "11", "13"] (multi-select) | ["triad"] |

### 2b. Mood engine
| Key | Type | Values | Default |
|---|---|---|---|
| `active_mood` | string | "epic" \| "dark" \| "hopeful" \| "sad" \| "tension" \| "mystery" \| "fantasy" \| "adventure" \| "love" \| "horror" | "epic" |
| `mood_intensity` | float | 0.0 – 1.0 | 0.5 |
| `mood_regen_counter` | int | monotonic, for resampling suggestions | 0 |

### 2c. Voicing
| Key | Type | Values | Default |
|---|---|---|---|
| `inversion` | enum | "root" \| "1st" \| "2nd" | "root" |
| `drop2` | bool | false / true | false |
| `bass_note` | string \| null | note name or null | null |
| `voicing_type` | enum | "standard" \| "open" \| "spread" \| "cluster" (from `types/music.ts` `VoicingType`) | "standard" |
| `progression_voicing` | string \| null | style preset name (PROGRESSION STYLE dropdown) | null |

### 2d. Instrument
| Key | Type | Values | Default |
|---|---|---|---|
| `active_instrument` | string | "piano" \| "flute" \| "strings" \| "trumpet" | "piano" |

### 2e. Progression
| Key | Type | Description |
|---|---|---|
| `progression` | ChordEntry[] | Ordered list. Each entry: `{ notes, displayName, roman, sourceRoot, sourceScale, inversion?, drop2?, bassNote?, voicingType?, bars }` |
| `selected_index` | int \| null | Currently selected chord card index (UI focus) |

### 2f. UI mode flags
| Key | Type | Values | Default |
|---|---|---|---|
| `piano_view` | enum | "scale" \| "chord" | "scale" |
| `transport_sync_mode` | enum | "auto" \| "always_standalone" \| "always_host" | "auto" |

### 2g. Project name (current session)
| Key | Type | Default |
|---|---|---|
| `project_name` | string | "Untitled" |
| `active_session_id` | string \| null | null |

---

## 3. File-based session library (separate from DAW state blob)

User's named projects live in `%APPDATA%\AstroHarmony\sessions\` as JSON files, one per session. This data is **shared across DAW sessions** — same user, same machine. The Projects dropdown lists these.

### Per-session schema
```json
{
  "id": "uuid",
  "name": "Untitled",
  "createdAt": 1718000000000,
  "updatedAt": 1718000000000,
  "data": { /* the entire persisted custom state blob (section 2) */ }
}
```

### Operations (via JS↔C++ native functions, see section 5)
- `listSessions()` → SessionMeta[]
- `loadSession(id)` → full state, applied to plugin state
- `saveCurrentSession(name?)` → writes/updates file
- `deleteSession(id)`
- `renameSession(id, newName)`
- `duplicateSession(id)`

---

## 4. Read-only UI feedback (C++ → JS)

Pushed from the processor/editor via `WebBrowserComponent::emitEventIfBrowserIsVisible()` at 30 Hz (timer in editor).

| Event id | Payload | Source |
|---|---|---|
| `currentBeatChanged` | `{ index: int, position01: float }` | Scheduler — drives ChordCard active-state ring + progress bar |
| `playStateChanged` | `{ isPlaying: bool, mode: "standalone" \| "host" }` | Scheduler / AudioPlayHead |
| `hostBpmChanged` | `{ bpm: float, isHostPlaying: bool }` | processBlock reading AudioPlayHead |
| `previewNotes` | `{ notes: string[], voiced: string[] }` | When a chord is being previewed (highlight piano) |
| `error` | `{ message: string, severity: "warn" \| "error" }` | Sample load failures, midi export errors, etc. |

---

## 5. JS → C++ native functions (request/response)

Registered in PluginEditor via `withNativeFunction(name, lambda)`. JS calls via `Juce.getNativeFunction("name")(...args)`.

### Audio control
| Function | Args | Returns | Purpose |
|---|---|---|---|
| `playChord` | `notes: string[], inversion: string, drop2: bool, voicingType: string` | void | Trigger one-shot chord preview |
| `playProgression` | `progression: ChordEntry[], loop: bool` | void | Start scheduler with current progression |
| `stopAll` | — | void | Stop scheduler + release all voices |
| `setInstrument` | `id: string` | void | Switch active sampler |

### State sync (JS is source of truth for UI; C++ persists)
| Function | Args | Returns | Purpose |
|---|---|---|---|
| `requestInitialState` | — | full state JSON | Called on WebView load to hydrate React/Zustand store |
| `pushState` | full state JSON | void | JS pushes whenever Zustand changes (debounced 200 ms) |

### Sessions (file I/O — must be C++ side)
| Function | Args | Returns |
|---|---|---|
| `listSessions` | — | `SessionMeta[]` |
| `loadSession` | `id: string` | state JSON |
| `saveCurrentSession` | `name?: string` | `SessionMeta` |
| `deleteSession` | `id: string` | void |
| `renameSession` | `id: string, newName: string` | void |
| `duplicateSession` | `id: string` | `SessionMeta` |

### MIDI export
| Function | Args | Returns |
|---|---|---|
| `exportMidi` | `midiBytes: number[]` (Uint8Array of the .mid generated by `lib/midi.ts`) | `{ success: bool, path?: string, error?: string }` |

> The `lib/midi.ts` engine runs in JS and produces the MIDI byte array. C++ side only handles the `FileChooser` save dialog — sidesteps re-implementing MIDI encoding.

### Diagnostics (dev only, retained for production troubleshooting)
| Function | Args | Returns |
|---|---|---|
| `getBuildInfo` | — | `{ version, buildDate, juceVersion, sampleRate }` |

---

## 6. Mood engine data (bundled, not parameters)

10 mood definition files (~3,000 lines total) are pure data — copied from `cinematic-composer/lib/moodEngine/data/`:

| Mood | File (source) | Preferred root | Preferred modes | Default voicing |
|---|---|---|---|---|
| epic | epic.ts (220 lines) | D# (E♭) | Ionian, Mixolydian, Aeolian | open |
| dark | dark.ts (202 lines) | varies | Aeolian, Phrygian, Locrian | cluster |
| hopeful | hopeful.ts (188 lines) | C | Ionian, Lydian | standard |
| sad | sad.ts (175 lines) | A (minor) | Aeolian, Dorian | spread |
| tension | tension.ts (178 lines) | varies | Phrygian, Locrian, alt | cluster |
| mystery | mystery.ts (155 lines) | varies | Dorian, Lydian | spread |
| fantasy | fantasy.ts (154 lines) | varies | Lydian, Mixolydian | open |
| adventure | adventure.ts (150 lines) | varies | Mixolydian, Dorian | open |
| love | love.ts (159 lines) | varies | Ionian, Dorian | standard |
| horror | horror.ts (159 lines) | varies | Locrian, altered | cluster |

The mood engine API (`suggestNext`, `analyseChordFunction`, `resolveFunction`) is consumed by JS at runtime — no C++ involvement.

---

## 7. Sample assets (bundled, not parameters)

Embedded as `juce_add_binary_data` from `cinematic-composer/public/samples/`:

| Instrument | Files | Source license | Size (approx) |
|---|---|---|---|
| Grand Piano (Salamander V3) | A0–C8 every ~3 semitones (~30 MP3s) | CC0 | ~5 MB |
| Flute | C4–C7 every ~3 semitones (~10 MP3s) | (see source repo) | <1 MB |
| Strings (VSCO 2 CE Violin Section) | G3–D6 (~11 MP3s) | CC-BY 4.0 (attribution carried in About) | ~1 MB |
| Trumpet | F#3–D6 (~9 MP3s) | (see source repo) | <1 MB |

Sample maps from `cinematic-composer/lib/instruments.ts` ported 1:1. JUCE `Sampler` interpolates between mapped pitches for unmapped notes.

---

## 8. Canonical ID constants (for `ParameterIDs.hpp` and JS)

```cpp
namespace ParameterIDs {
    inline constexpr auto TEMPO            = "tempo";
    inline constexpr auto MASTER_VOLUME    = "master_volume";
    inline constexpr auto PITCH_TRANSPOSE  = "pitch_transpose";
    inline constexpr auto LOOP             = "loop";
    inline constexpr auto BYPASS           = "bypass";
}
```

JS side (same strings) for `WebSliderRelay`/`WebToggleButtonRelay` registration.

---

## 9. DSP signal chain (for reference — full design in /plan)

```
Scheduler → Synthesiser (Sampler voices, max 8 poly) → Reverb (light) → master_volume → output
                                                                              ↑
                                                                  pitch_transpose modulates sampler rate
```

No input audio — this is a pure generator (synth-style) plugin.

---

## 10. Validation rules

- All chord notes are pitch-class strings ("C", "C#", "Eb" → normalize to sharps for sample keys)
- Bar count per chord: 1, 2, or 4 (matches Electron app behavior)
- Max progression length: 32 chords (UI-soft, larger possible)
- Max saved sessions: unlimited (file-based — disk-limited)
- All paths in session files use forward slashes for cross-platform compatibility
