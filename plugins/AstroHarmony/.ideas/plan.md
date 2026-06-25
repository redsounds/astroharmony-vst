# AstroHarmony — Implementation Plan

## Complexity Score: 5 / 5

Rationale in [architecture.md](architecture.md#complexity-assessment). Short: multi-thread state coordination, mid-flight sampler swap, host transport sync, file-based session library, 1:1 port of a mature Electron app. De-risked by Phase 0 spike (`plugins/AstroHarmony_Spike`).

## UI Framework: WebView (JUCE 8 WebView2)

Validated end-to-end in Phase 0 spike. Decision rationale in [creative-brief.md § Source of Truth](creative-brief.md). Single-file bundle via `vite-plugin-singlefile` sidesteps the resource-provider path collision bug we hit on SimpleGain.

## Implementation Strategy: PHASED

7 sub-phases, each shippable (builds, installs, has user-verifiable behavior). Each phase has its own `git` commit. **No phase starts before the previous one is verified by the user in FL Studio.**

---

## Sub-phase A — Plugin Skeleton

### Goal
Empty AstroHarmony plugin in FL Studio. WebView shows "loading" placeholder. APVTS exposed (5 params). No DSP yet.

### Tasks
- [ ] `plugins/AstroHarmony/` skeleton: CMakeLists.txt (with `NEEDS_WEBVIEW2 TRUE`, binary_data target placeholder)
- [ ] `Source/ParameterIDs.hpp`
- [ ] `Source/PluginProcessor.h/.cpp` — APVTS with all 5 params from [parameter-spec.md § 1](parameter-spec.md), bypass via `getBypassParameter()`, empty `processBlock` (clears output)
- [ ] `Source/PluginEditor.h/.cpp` — WebView host, **relays + attachments for 4 non-bypass params** (tempo, master_volume, pitch_transpose, loop), 30 Hz Timer with placeholder emit, single-file resource provider (pattern from spike)
- [ ] `Source/ui/public/index.html` — placeholder (will be overwritten by Sub-phase B Vite output)
- [ ] Run `validate-webview-setup.ps1` + `validate-webview-member-order.ps1`
- [ ] Build VST3 + Standalone, install to system VST3
- [ ] **Verify in FL Studio:** plugin loads, window opens (placeholder content), DAW shows 4 automatable params

### Definition of Done
- Both validators pass
- Plugin loads in FL Studio without crash
- Tempo / volume params visible in DAW automation list
- Header bypass works (host mutes plugin)

### Estimated time
1 day

---

## Sub-phase B — Vite + React UI Port

### Goal
Full AstroHarmony UI renders in the plugin window. No audio yet, no state persistence yet — all visual + interactive client-side state only.

### Tasks
- [ ] Set up `_tools/astroharmony-ui/` (production Vite project — promote from `astroharmony-ui-spike`)
- [ ] Copy `lib/theory.ts`, `lib/voicings.ts`, `lib/moodEngine/**`, `lib/midi.ts`, `types/music.ts` from cinematic-composer (1:1, no modifications)
- [ ] Vendor `juce/index.js` + `juce/check_native_interop.js` (as in spike)
- [ ] Port `components/v2/*.tsx` (14 components). Modifications:
  - Strip Next.js-specific things (`'use client'`, dynamic imports)
  - Replace `import Tone from 'tone'` audio calls with native function calls to `playChord`/`playProgression`/`stopAll` (mocked initially — just `console.log` until Sub-phase D)
  - Replace localStorage session calls with native function stubs (mocked initially)
- [ ] Port `lib/store.ts` (Zustand) — sessions removed for now, will be wired in Sub-phase E
- [ ] Port `app/globals.css` color tokens + Fraunces/DM Sans fonts (bundle inline — no Google Fonts CDN)
- [ ] `npm run build` → single HTML bundle → copy to `plugins/AstroHarmony/Source/ui/public/index.html`
- [ ] Add `scripts/build-astroharmony-ui.ps1` — one-command UI rebuild + copy + plugin rebuild
- [ ] Rebuild + reinstall plugin
- [ ] **Verify in FL Studio:** full UI renders identical to Electron app screenshot. Knobs clickable, sliders draggable, mood switch works visually, chord clicks add to progression, DnD reorder works. No audio yet.

### Definition of Done
- All 10 moods selectable, suggestions update
- All chord rows render (Diatonic, sus2, sus2+13, sus4, sus4+13, etc.)
- Suggestion engine fires on chord adds (`SuggestedChords` shows 6 named patterns)
- Side-by-side visual comparison with Electron app: matches
- Bundle size ≤ 1.5 MB

### Estimated time
4–5 days

---

## Sub-phase C — JS ↔ C++ Bridge Protocol

### Goal
All ~15 native functions and ~5 push events wired and tested. State round-trips between JS Zustand and C++ persisted blob.

### Tasks
- [ ] Implement all native functions in PluginEditor:
  - Audio stubs (return success but no audio yet): `playChord`, `playProgression`, `stopAll`, `setInstrument`
  - State: `requestInitialState`, `pushState` (cache as `juce::String`)
  - Session stubs: `listSessions`, etc. (return empty array; real impl in Sub-phase E)
  - MIDI stub: `exportMidi` (return `{success: false, error: "not implemented yet"}`)
  - `getBuildInfo`
- [ ] Implement push events from editor Timer: `currentBeatChanged` (fake counter), `playStateChanged`, `hostBpmChanged` (reads from processor atomic)
- [ ] Add `processBlock` AudioPlayHead reader → updates `std::atomic<float> hostBpm`, `std::atomic<bool> hostIsPlaying`
- [ ] Wire `pushState` to feed `getStateInformation` / `setStateInformation`
- [ ] JS side: Zustand subscription debounced 200 ms → `pushState`
- [ ] JS side: `requestInitialState` on app mount → hydrate Zustand
- [ ] Rebuild + reinstall
- [ ] **Verify:** save DAW project with progression set + mood = Epic → close + reopen project → progression + mood restored. Host BPM display updates when DAW changes tempo.

### Definition of Done
- DAW project save/reload preserves: progression, mood, scale, voicing, instrument, all UI state
- `hostBpmChanged` event fires when user changes DAW tempo
- `playStateChanged` event fires when user starts/stops DAW transport (even with no audio yet)

### Estimated time
2–3 days

---

## Sub-phase D — Sampled Instrument Engine

### Goal
Audio works. All 4 instruments load from BinaryData and play through the JUCE Synthesiser when chord buttons are clicked or progression plays.

### Tasks
- [ ] Add `juce_add_binary_data(AstroHarmony_Samples ...)` target in CMakeLists.txt with all ~60 mp3 files from `cinematic-composer/public/samples/` (Salamander Piano + Flute + Strings + Trumpet)
- [ ] Implement `Source/audio/InstrumentSamplerLoader.cpp`:
  - For each instrument, build `juce::SamplerSound` list from BinaryData mp3 blobs (decode via `juce::MP3AudioFormat`)
  - Apply per-instrument envelope (`attack`, `release` from `instruments.ts`)
  - Map root notes from `SAMPLE_MAP` (e.g., trumpet maps `D4 → D4.mp3`)
- [ ] Implement `Source/audio/SchedulerComponent.cpp`:
  - Standalone mode tick loop using sample-counter + `tempo` param
  - Triggers `synth.noteOn(midi, velocity)` for each chord note
  - Tracks `currentBeat` atomic for UI
- [ ] `juce::Synthesiser` setup in processor: 8 voices, swap sound set on `setInstrument` (deferred swap via SpinLock)
- [ ] `juce::dsp::Reverb` chain after synth (params match Tone.js: roomSize=0.45, damping=0.55, wetLevel=0.14)
- [ ] Master volume gain stage with smoothing
- [ ] Pitch transpose: scale `note - 60` semitones by `pitch_transpose` value before sampler lookup
- [ ] JS bridge: `playChord` actually plays now. `playProgression` starts scheduler.
- [ ] Rebuild + reinstall
- [ ] **A/B test:** play same chord progression in plugin and Electron app. Compare timbre. Iterate envelope/reverb until "recognizably similar."

### Definition of Done
- All 4 instruments switchable, audible, distinct
- Chord click → preview audible within ~20 ms
- Progression play loops cleanly, no clicks at chord boundaries
- 8-voice polyphony works (large chords don't drop notes)
- A/B comparison with Electron app: acceptable similarity per user judgment

### Estimated time
3–4 days

### Risk hotspot
This sub-phase has the highest unknown. If JUCE `Sampler` interpolation sounds noticeably worse than Tone.Sampler at sparse map points, options are:
- Pre-render denser sample maps offline → larger DLL
- Switch to `sforzando` SFZ format (more sophisticated interpolation)
- Accept and document the difference

---

## Sub-phase E — Session Storage

### Goal
Multi-project library works: user can save/name/load/delete/duplicate sessions across DAW sessions. ProjectMenu UI fully functional.

### Tasks
- [ ] Implement `Source/io/SessionStore.cpp`:
  - `getSessionsDir()` → `juce::File::SpecialLocationType::userApplicationDataDirectory + "AstroHarmony/sessions/"`
  - Create dir on first use
  - `listSessions()` — glob `*.json`, parse metadata
  - `loadSession(id)` — read JSON, return state blob
  - `saveCurrentSession(name?)` — write/update file with UUID + timestamp
  - `deleteSession`, `renameSession`, `duplicateSession`
- [ ] Wire all session native functions in PluginEditor to call SessionStore (already had stubs from Sub-phase C)
- [ ] Port `components/v2/ProjectMenu.tsx` interactions to call native functions
- [ ] Auto-save on state change (debounced 5 s) — overwrite active session if one is loaded
- [ ] Rebuild + reinstall
- [ ] **Verify:** save session "My Progression" → close plugin → reopen → load from Projects dropdown → state restored. Duplicate creates copy. Delete works. Rename works.

### Definition of Done
- Sessions persist in `%APPDATA%\AstroHarmony\sessions\`
- Sessions list survives DAW close+reopen
- Multiple sessions can be saved
- Loading a session replaces current state cleanly

### Estimated time
1–2 days

---

## Sub-phase F — Host Transport Sync

### Goal
When DAW is playing, plugin progression locks to host BPM and bar position. When DAW is stopped, plugin uses internal tempo.

### Tasks
- [ ] In `processBlock`, read `AudioPlayHead::getPosition()` (JUCE 8 API)
- [ ] Detect transport state transitions (stopped → playing, playing → stopped)
- [ ] Scheduler mode auto-switch based on `transport_sync_mode` state + actual host state
- [ ] Host-sync mode math: align next chord trigger to next bar boundary using `ppqPosition`
- [ ] Snap to bar — if user starts host playback mid-chord, the *next* chord on the next bar
- [ ] UI indicator: TopBar shows "● Synced to host" (cyan) vs "○ Standalone" (muted)
- [ ] Push `playStateChanged` events with mode info to JS
- [ ] Rebuild + reinstall
- [ ] **Verify in FL Studio + Reaper:** load plugin, build 4-chord progression, set DAW tempo to 120 → play DAW transport → chord changes lock to bars. Change DAW tempo mid-playback → plugin follows. Stop DAW → plugin falls back to standalone tempo.

### Definition of Done
- Host BPM drives scheduler when DAW plays
- Bar boundaries align to DAW's `ppqPosition`
- Mode indicator UI updates correctly
- Standalone mode unchanged when DAW stopped

### Estimated time
2 days

---

## Sub-phase G — MIDI Export + Polish

### Goal
EXPORT MIDI button works. Final UX polish. Ready for v1 ship.

### Tasks
- [ ] JS side: invoke `lib/midi.ts` to generate `.mid` byte stream from current progression
- [ ] Convert `Uint8Array` to `juce::var` Array of bytes → pass to `exportMidi(bytes)` native function
- [ ] C++ `exportMidi` impl: open `juce::FileChooser` (suggest filename from `project_name`), write bytes to chosen path
- [ ] Pitch slider works (already in APVTS — verify it actually transposes audio + MIDI export)
- [ ] Settings popover — at minimum: about info, "open sessions folder" button (`Process::openDocument`), maybe sample rate display
- [ ] Volume slider perceptual taper verification
- [ ] Final visual polish: compare side-by-side with Electron app, fix any visible drift
- [ ] Rebuild + reinstall
- [ ] **Verify:** export MIDI → load resulting `.mid` into the DAW → notes play back correctly. All UI buttons that should do something, do.

### Definition of Done
- MIDI file is valid and notes match the in-plugin progression
- Pitch transpose affects both audio playback and MIDI export
- All Top/Bottom bar buttons functional
- No visible diffs from Electron app screenshot
- Plugin survives stress test: load + play + change instrument 20 times + close + reopen DAW project

### Estimated time
1–2 days

---

## Total Estimate
**14–18 days of focused implementation work** beyond the 3 days of /dream + /plan + /design.

Realistic calendar time with iteration + testing: **3–4 weeks.**

---

## Dependencies

### JUCE modules (no additions over what AstroHarmony_Spike already used)
Already listed in [architecture.md § Module Dependencies](architecture.md#module-dependencies-juce).

### External (npm — UI side, build-time only)
- `react@^19`, `react-dom@^19`
- `zustand@^5`
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `tonal@^6` (used by `lib/theory.ts`)
- `vite@^6`, `@vitejs/plugin-react`, `vite-plugin-singlefile`, `typescript@~5.6`

### External (samples)
- ~3 MB of mp3 files from `cinematic-composer/public/samples/`, embedded via `juce_add_binary_data` at build time

### Prerequisites already installed
- ✅ JUCE 8 (`_tools/JUCE/`)
- ✅ Microsoft.Web.WebView2 NuGet SDK (`%LOCALAPPDATA%\PackageManagement\NuGet\Packages\`)
- ✅ Node.js 24.15.0, npm 11.17.0
- ✅ CMake 3.31 (via VS 2022 Community)

---

## Risk Assessment (updated post-spike)

### High Risk (was)
- ~~Vite + React 19 + JUCE WebView2 boot~~ — **eliminated by Phase 0 spike**

### High Risk (remaining)
- **JUCE Sampler vs Tone.Sampler quality.** Sub-phase D is the moment of truth. Mitigation: early A/B test, multiple fallback paths documented.

### Medium Risk
- **State sync round-trip latency** on rapid UI changes (DnD mid-drag). Mitigation: pushState debounced 200 ms; drag mid-flight stays in JS only, commit on drop.
- **Sample BinaryData load time** at plugin instantiation (~60 mp3 files decoded). Mitigation: lazy decode per-instrument (only decode the active one until user switches).
- **Bundle size discipline.** Mitigation: bundle-analyzer check after Sub-phase B; tree-shake mood data lazy-load if needed.
- **AudioPlayHead null/zero edge cases** in some hosts (FL Studio in particular). Mitigation: defensive fallback to standalone mode when host position invalid.
- **macOS / Linux ports.** Not in v1 scope explicitly, but architecture should not preclude them. Mitigation: keep `juce::File::SpecialLocationType` use abstract.

### Low Risk (proven or trivial)
- React 19 boot in WebView2 ✅
- @dnd-kit drag-and-drop ✅
- JS↔C++ native function bridge ✅
- Single-file bundle resource provider ✅
- WebView2 member-order crashes ✅ (validators in place, pattern proven)
- APVTS state save/load (proven on SimpleGain)
- JUCE FileChooser

---

## Phase Gates (user verification required)

| Gate | Trigger | Who decides |
|---|---|---|
| Sub-phase A done | "Plugin loads in FL Studio, params visible" | User in FL Studio |
| Sub-phase B done | "UI matches Electron screenshot, all interactive" | User side-by-side comparison |
| Sub-phase C done | "DAW project save+reload preserves all state" | User test scenario |
| Sub-phase D done | "Audio works, A/B with Electron acceptable" | User listening test |
| Sub-phase E done | "Multi-session library round-trips" | User test scenario |
| Sub-phase F done | "Host transport sync works in FL + Reaper" | User test |
| Sub-phase G done | "Exported MIDI plays correctly, polish OK" | User final review |

After each gate: git commit, update status.json `phase_history`, ask user before starting next sub-phase.
