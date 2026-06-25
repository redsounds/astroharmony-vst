# SimpleGain — Parameter Specification

Definitive list of user-facing controls. All parameters are automatable and host-exposed.

## Parameters

| ID | Name | Type | Range | Default | Unit | Skew | Smoothing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `input_gain` | Input Gain | Float | -60.0 to +12.0 | 0.0 | dB | 4.0 (log around 0) | 20 ms linear |
| `output_trim` | Output Trim | Float | -60.0 to +12.0 | 0.0 | dB | 4.0 (log around 0) | 20 ms linear |
| `bypass` | Bypass | Bool | false / true | false | — | n/a | host-handled |

## Meter (read-only, not a parameter)

| ID | Name | Source | Units | Update Rate | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `meter_peak` | Peak Level | Post-input-gain, pre-output-trim | dBFS | 30 Hz UI poll | Per-channel; UI displays max of L/R |

## Notes
- **Skew (4.0 log around 0):** knob feels musical — small motions near unity make fine adjustments, extremes reach the rails quickly.
- **Smoothing:** 20 ms linear ramp on `input_gain` and `output_trim` per audio block to prevent zipper noise on automation.
- **Bypass:** must be sample-accurate and click-free; rely on JUCE's `AudioProcessor::getBypassParameter()` mechanism so the host handles latency-compensated bypass.
- **No preset slot, no A/B** in v0.1.
- **Channel handling:** mono in → mono out, stereo in → stereo out. No mono-summing, no L/R linking complexity (gain is the same on both channels by definition of a single Input Gain knob).

## Parameter IDs (canonical, for `AudioProcessorValueTreeState`)
```cpp
static constexpr auto kInputGainId  = "input_gain";
static constexpr auto kOutputTrimId = "output_trim";
static constexpr auto kBypassId     = "bypass";
```

## DSP-Signal Chain (high level — full design in /plan phase)
```
input → [input_gain] → [meter tap] → [output_trim] → output
                                ↑ also feeds bypass mux
```
