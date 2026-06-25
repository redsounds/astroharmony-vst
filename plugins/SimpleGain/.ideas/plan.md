# SimpleGain — Implementation Plan

## Complexity Score: 1 / 5

Justification lives in [architecture.md](architecture.md#complexity-assessment). Short version: two multiplies per sample, one peak detector, no buffers, no surprises.

## UI Framework: WebView (HTML/JS, JUCE WebView2 host on Windows)

### Rationale
- The README flags Visage as "in active testing, may be unstable on some hosts" — not the right pick for the *first* APC pipeline test, where we want pipeline issues to surface, not framework issues.
- WebView is the more battle-tested path in this repo, with a dedicated `skill_design_webview` quick-start that nails JUCE 8 + WebView2 member ordering on Windows.
- Iteration speed: the design phase can live-reload HTML/CSS without recompiling C++.
- Performance overhead at this complexity is negligible. The audio thread is untouched by the UI choice.

### Trade-offs accepted
- Slightly larger plugin bundle (HTML/JS assets).
- WebView2 runtime dependency on Windows (already a platform baseline assumption per the README).

## Implementation Strategy

**Single-Pass** (appropriate for Score ≤ 2).

Everything below ships in one /impl session:

- [ ] `SimpleGainProcessor` skeleton + `AudioProcessorValueTreeState` with `input_gain`, `output_trim`, `bypass`.
- [ ] `prepareToPlay`: reset smoothed values with 20 ms ramp at current sample rate; init meter release coefficient.
- [ ] `processBlock`:
  - bypass-check via `getBypassParameter()` (host handles the mux);
  - read smoothed input gain, multiply per sample, update per-channel peak meter;
  - read smoothed output trim, multiply per sample;
  - publish meter peaks to `std::atomic<float>` (L, R, max).
- [ ] `getStateInformation` / `setStateInformation` → delegate to APVTS XML.
- [ ] `SimpleGainEditor`:
  - construct `juce::WebBrowserComponent` pointing at bundled HTML;
  - install native function bindings for parameter get/set;
  - `juce::Timer @ 30 Hz` polls meter atomics → push to JS;
  - resize / DPI scaling per WebView2 patterns from `skill_design_webview`.
- [ ] HTML/CSS/JS UI (handed off from /design phase):
  - two knobs (Input Gain, Output Trim) wired to parameter bridge;
  - one vertical or horizontal peak meter with simple peak-hold;
  - dark theme (#1E1E22 charcoal, soft accent).
- [ ] Null-test sanity check at unity settings.

## Dependencies

### Required JUCE 8 modules
- `juce_audio_basics`
- `juce_audio_processors`
- `juce_audio_plugin_client`
- `juce_core`
- `juce_data_structures`
- `juce_dsp` *(only for `juce::Decibels` helpers; could be dropped if we want to trim)*
- `juce_events`
- `juce_graphics`
- `juce_gui_basics`
- `juce_gui_extra` *(for `juce::WebBrowserComponent`)*

### Platform
- **Windows:** WebView2 runtime (Evergreen). Bundled or relied on as a Windows 11 component per the repo's stated platform baseline.

### External
- None. No DSP libs, no fonts, no icon packs. UI assets ship as static files in the plugin bundle.

## Risk Assessment

### High Risk
- *(none)* — DSP is trivial; no real-time, allocation, or threading hazards beyond standard JUCE patterns.

### Medium Risk
- **WebView2 member-ordering on Windows.** Wrong init order will crash on plugin instantiation in DAWs. Mitigation: follow `skill_design_webview` checklist exactly; run `scripts/validate-webview-member-order.ps1` before first launch.
- **DAW WebView2 isolation.** Some DAWs run plugins in restrictive sandboxes that prevent WebView2 from initializing. Mitigation: pick Reaper as the first-target DAW (known good); validate Ableton Live separately during /ship.

### Low Risk
- dB→linear conversion at -60 dB rail: trivial — clamp behavior delegated to `juce::Decibels::decibelsToGain(dB, -60.0f)`.
- Parameter smoothing zipper noise: `SmoothedValue` is bulletproof at this scale.
- Bypass clicks: host-handled bypass eliminates this entire class of bug.

## Target DAWs (validation order)
1. **Reaper** — known-good WebView host, fast turnaround.
2. **Ableton Live 11/12** — primary target user; verify WebView2 boots inside Live's sandbox.
3. *(stretch)* FL Studio, Cubase, Bitwig — only if first two pass without quirks.

## Definition of Done (for /impl phase)
- Plugin loads in Reaper as VST3 without errors or warnings in the log.
- Knobs adjust gain audibly; meter responds in real time.
- Bypass null-test passes byte-for-byte at unity settings.
- No allocations on the audio thread (verified via JUCE's `juce::ScopedNoDenormals` + manual review — no need for a profiler at this size).
- APVTS round-trips (save preset, reload, settings restored).
