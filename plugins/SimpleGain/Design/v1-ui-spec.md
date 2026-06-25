# SimpleGain — UI Specification v1

## Design Source
- **Library Design:** Amber Signal
- **Library ID:** `amber-signal`
- **Style:** Warm, signal-flow, studio-oriented — dark surface with neon amber accent.
- **Adapted for:** A 2-knob + meter utility layout (the library mockup is a synth-style multi-section design — this spec strips it down to a single horizontal signal-flow strip).

## Window
- **Size:** 520 × 260 px (compact horizontal strip — appropriate for a utility plugin)
- **Resizable:** No (v1). Future versions may add 2× scale option.
- **DPI scaling:** Honor host scale factor via WebView CSS transforms.

## Layout

```
┌────────────────────────────────────────────────────────┐
│ SIMPLE GAIN                                  [BYPASS]  │  ← Header (44 px)
├────────────────────────────────────────────────────────┤
│                                                        │
│   ┌─────────┐    ┌──────────┐    ┌─────────┐         │
│   │  INPUT  │    │  ▓▓▓▓ L  │    │ OUTPUT  │         │  ← Body (184 px)
│   │ (knob)  │    │  ▓▓▓▓ R  │    │ (knob)  │         │
│   │  0.0dB  │    │ peak hold│    │  0.0dB  │         │
│   └─────────┘    └──────────┘    └─────────┘         │
│                                                        │
├────────────────────────────────────────────────────────┤
│ PEAK: -inf dB                          JUCE WEBVIEW 8  │  ← Footer (32 px)
└────────────────────────────────────────────────────────┘
```

- **Grid:** 3-column body, equally weighted (1fr 1fr 1fr) with 24 px gap.
- **Top accent stripe:** 3 px amber bar across full plugin width (carried from amber-signal house style).
- **Section panels:** subtle surface-highlight background (`#292930`) for each of the three control areas.

## Controls

| Parameter ID | Display Name | Type | Position | Range | Default | Visual Notes |
|---|---|---|---|---|---|---|
| `input_gain` | INPUT | Rotary knob | Left column | -60 … +12 dB | 0.0 dB | 80 px SVG arc knob, amber value-arc, ns-resize cursor, numeric readout below |
| `output_trim` | OUTPUT | Rotary knob | Right column | -60 … +12 dB | 0.0 dB | 80 px SVG arc knob, amber value-arc, ns-resize cursor, numeric readout below |
| `bypass` | BYPASS | Toggle pill | Header right | bool | false | Amber when active (= signal passing), dim when bypassed |

### Read-only
| ID | Display | Position | Range | Visual |
|---|---|---|---|---|
| `meter_peak` | L / R | Center column | -60 … 0 dBFS | Two vertical bar meters (L, R) — surface background with amber fill, peak-hold dot held 1.5 s. Footer text shows the max of L/R as a numeric `PEAK: x.x dB`. |

### Knob Behavior
- **Sweep:** 270° (from 7 o'clock to 5 o'clock), starting at -135° rotation (matching amber-signal SVG pattern).
- **Drag:** Vertical drag (`ns-resize`), 1 px = ~0.5 dB by default, hold Shift for ×0.1 fine control.
- **Double-click:** reset to default (0.0 dB).
- **Right-click:** clear-text numeric entry (future v2 — for v1, show host parameter menu via JUCE bridge).
- **Mouse-wheel:** ±1 dB per detent.

### Meter Behavior
- **Render:** 30 Hz from `juce::Timer`, reading `std::atomic<float>` per channel.
- **Scale:** linear in pixels mapped from dBFS over -60 … 0.
- **Color zones:** -60..-12 amber primary, -12..-3 brighter amber, -3..0 red (`#FF4D4D`) for overs.
- **Peak hold:** 1.5 s decay, then linear fall.

## Color Palette (from amber-signal `design-system.json`)
- Background: `#101014`
- Surface: `#1A1A1F`
- Surface highlight: `#292930`
- Primary (amber): `#FFC300`
- Accent (amber): `#FFC300`
- Secondary (cyan, used sparingly for peak-hold dot): `#00FFF0`
- Over-level red: `#FF4D4D` *(added for meter -3..0 zone — not in base palette)*
- Text primary: `#F0F0F5`
- Text secondary: `#A0A0A5`
- Border: `#3A3A45`

## Typography
- Font family: `'Roboto Mono', monospace` (Google Fonts — fallback to system mono)
- Headings/labels: 0.65 rem, bold, uppercase, 0.1 em letter-spacing
- Knob value readouts: 1.0 rem, regular
- Footer: 0.7 rem, 50% opacity

## Style Notes
- The amber-signal source mockup is busy (4 sections, faders, knobs). For SimpleGain we **strip down** to a single horizontal strip: input → meter → output. This matches the signal-flow ethos of the design system while suiting a utility plugin.
- **Active glow:** amber knob arc has a subtle `box-shadow: 0 0 6px #FFC30033` when value > -60 dB (from `design-system.json#components.activeGlow`).
- **Bypass state visual:** when bypassed, the meter goes dark, both knobs desaturate to 40% opacity, and the top accent stripe dims to `#3A3A45`.

## What is intentionally NOT included
- Preset browser (per brief: "no preset browser").
- A/B compare.
- Logo / branding chrome (header text alone serves as branding).
- Resize handle.
- Tooltip overlays (v2 candidate).

## Parameter ID → DOM ID mapping (for /impl phase)
| Parameter ID | DOM ID | Element |
|---|---|---|
| `input_gain` | `input_gain-knob` | `<svg>` inside `.knob-container` |
| `input_gain` | `input_gain-value` | numeric readout `<span>` |
| `output_trim` | `output_trim-knob` | `<svg>` inside `.knob-container` |
| `output_trim` | `output_trim-value` | numeric readout `<span>` |
| `bypass` | `bypass-toggle` | `<button>` in header |
| `meter_peak` | `meter-l-fill` | vertical fill `<div>` (L channel) |
| `meter_peak` | `meter-r-fill` | vertical fill `<div>` (R channel) |
| `meter_peak` | `meter-readout` | footer text `<span>` |
