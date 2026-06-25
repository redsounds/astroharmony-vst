# SimpleGain — DSP Architecture Specification

## Core Components

SimpleGain is intentionally minimal. The DSP graph contains four building blocks:

1. **Input Gain Stage** — sample-by-sample multiply by a smoothed linear factor derived from the `input_gain` dB parameter.
2. **Meter Tap** — non-destructive peak detector that observes the signal *after* input gain and *before* output trim. Maintains per-channel peak with simple envelope release. Writes results into a lock-free single-producer/single-consumer slot read by the UI on a timer.
3. **Output Trim Stage** — second sample-by-sample multiply, fed by a smoothed linear factor derived from `output_trim` dB.
4. **Bypass Mux** — handled via JUCE's `getBypassParameter()` so the host gets sample-accurate, latency-compensated bypass for free; no custom crossfade needed at this complexity tier.

### Real-Time Safety
- No allocations, no locks, no file I/O on the audio thread.
- All parameter reads go through `juce::AudioParameterFloat`/`juce::SmoothedValue<float, ValueSmoothingTypes::Linear>`.
- Meter → UI hand-off via `std::atomic<float>` (one per channel + a max).

## Processing Chain

```
                                ┌── Meter Tap ──► (atomic → UI)
                                │
Input ─► Input Gain (smoothed) ─┼─► Output Trim (smoothed) ─► Output
                                │
                                └── (bypass path handled by JUCE host)
```

## Parameter Mapping

| Parameter | DSP Component | Function | Range | Smoothing |
|-----------|---------------|----------|-------|-----------|
| `input_gain` | Input Gain Stage | Pre-meter level | -60 dB … +12 dB | 20 ms linear |
| `output_trim` | Output Trim Stage | Post-meter makeup | -60 dB … +12 dB | 20 ms linear |
| `bypass` | JUCE host mux | Sample-accurate bypass | bool | host-handled |
| `meter_peak` *(read-only)* | Meter Tap | Per-channel peak in dBFS | -inf … 0 dBFS (clamped to -60 for UI) | 30 Hz UI poll, ~300 ms release |

### Implementation Notes per Parameter
- **dB → linear conversion** uses `juce::Decibels::decibelsToGain(dB, -60.0f)` so the -60 dB rail is treated as `-inf` (silence).
- **SmoothedValue** is reset on `prepareToPlay` with a 20 ms ramp at the current sample rate.
- **Meter envelope:** new sample → `peak = max(|x|, peak * release_coeff)`. `release_coeff = exp(-1 / (release_sec * sampleRate))` with `release_sec = 0.3`.

## Class Layout (preview — full design in /impl phase)

- `SimpleGainProcessor : public juce::AudioProcessor`
  - Owns `juce::AudioProcessorValueTreeState apvts`.
  - Holds two `juce::SmoothedValue<float>` (input, output) and two `std::atomic<float>` (meterL, meterR).
  - Implements `processBlock`, `prepareToPlay`, `releaseResources`, `getStateInformation`/`setStateInformation` (delegated to APVTS), `getBypassParameter`.
- `SimpleGainEditor : public juce::AudioProcessorEditor`
  - Hosts a `juce::WebBrowserComponent` (WebView2 on Windows) pointing at the bundled HTML UI.
  - Bridges parameter changes ↔ JS via JUCE's WebView native function binding.
  - `juce::Timer` at 30 Hz pushes meter atomics to JS.

## Complexity Assessment

**Score: 1 / 5 (Simple)**

### Rationale
- A single multiply per sample per channel for each gain stage — the textbook "Level 1" DSP example from the skill rubric.
- No filters, no envelopes, no buffers (other than the host's), no oversampling, no state to persist beyond APVTS.
- Meter is a 5-line peak detector with a release coefficient.
- All real-time concerns are handled by stock JUCE primitives (`SmoothedValue`, `AudioParameterFloat`, `atomic<float>`).
- The only piece outside the "Hello, World" gain plugin tutorial is the WebView bridge for meter data — and that's UI plumbing, not DSP.

**Implication for implementation:** single-pass implementation is appropriate. No need to split into phases.
