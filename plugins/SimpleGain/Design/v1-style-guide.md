# SimpleGain — Style Guide v1

Derived from `design_library/amber-signal/` with the additions and constraints below applied for the SimpleGain utility layout.

## Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#101014` | Plugin background (outside the surface card) |
| `--color-surface` | `#1A1A1F` | Main plugin surface, footer background |
| `--color-surface-hl` | `#292930` | Section panels (the three body columns) |
| `--color-primary` | `#FFC300` | Knob arcs, top accent stripe, active text accents |
| `--color-accent` | `#FFC300` | Knob handles, bypass-on indicator |
| `--color-secondary` | `#00FFF0` | Peak-hold dot only (sparingly) |
| `--color-danger` | `#FF4D4D` | Meter -3..0 dB zone (overs) **[NEW — not in base palette]** |
| `--color-text-primary` | `#F0F0F5` | Knob values, header text |
| `--color-text-secondary` | `#A0A0A5` | Knob labels, footer text |
| `--color-border` | `#3A3A45` | Panel borders, dashed outlines |

## Typography

| Role | Family | Size | Weight | Casing | Letter-spacing |
|---|---|---|---|---|---|
| Plugin name (header) | Roboto Mono | 0.85 rem | 700 | UPPERCASE | 0.05 em |
| Section labels (INPUT, OUTPUT, L, R) | Roboto Mono | 0.65 rem | 700 | UPPERCASE | 0.1 em |
| Knob value readouts | Roboto Mono | 1.0 rem | 400 | as entered | normal |
| Footer text | Roboto Mono | 0.7 rem | 400 | UPPERCASE | normal (50% opacity) |

Font loaded via Google Fonts at preview time:
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;700&display=swap" rel="stylesheet">
```
Production builds will bundle the font locally for offline use.

## Spacing & Layout

| Token | Value | Use |
|---|---|---|
| Plugin total | 520 × 260 px | Fixed canvas |
| Outer padding | 0 | Plugin fills its window |
| Surface border-radius | 4 px | Card corners |
| Top accent stripe | 3 px | Full-width amber bar (carries amber-signal house style) |
| Header height | 44 px | "SIMPLE GAIN" + bypass |
| Footer height | 32 px | Peak readout + JUCE tag |
| Body padding | 16 px | Inside the body container |
| Body grid gap | 24 px | Between the three columns |
| Section panel padding | 16 px | Inside each `.panel-box` |
| Section label position | top 8 px, left 12 px | Absolute, inside panel |

## Components

### Knob (80 px)
- SVG arc — 36 px radius, 6 px stroke, `stroke-linecap: round`.
- Background arc: `var(--color-surface-hl)` (full 270° sweep).
- Value arc: `var(--color-primary)` (animated `stroke-dasharray` based on value).
- Rotation transform: starts at 135° (= 7-o'clock origin).
- Active glow when value > -60 dB: `filter: drop-shadow(0 0 4px rgba(255, 195, 0, 0.4))`.
- Label below: 8 px gap, secondary text color.
- Value below label: 4 px gap, primary text color, monospace.
- Cursor: `ns-resize`.

### Meter (vertical, per channel)
- Width 18 px, height = panel content height.
- Background: `var(--color-surface)` with 1 px `var(--color-border)`.
- Fill: bottom-anchored `<div>`, height animated via `transform: scaleY(...)` or `height: %` updated at 30 Hz.
- Fill color computed in CSS via three stops: amber primary 0–60% (i.e. -60..-12 dB), brighter amber 60–80% (-12..-3), `var(--color-danger)` 80–100% (-3..0).
  - Implement as three stacked `<div>` segments OR a linear-gradient with `--meter-pct` CSS var.
- Peak-hold dot: 4 px tall horizontal line, `var(--color-secondary)`, fades over 1.5 s.

### Bypass toggle (pill)
- 56 × 22 px capsule.
- Off (= plugin active): amber border + filled amber dot on the right.
- On (= bypassed): dim border + empty dot on the left.
- Label "BYPASS" inside, 0.6 rem.

### Top accent stripe
- 3 px tall full-width amber line at the top of the plugin surface (above the header), carrying the amber-signal house style.

## States

| State | Visual |
|---|---|
| Default | All amber accents at full saturation, meter shows live signal |
| Bypassed | Top stripe dim `#3A3A45`; knobs desaturated 40% opacity; meter goes dark; bypass pill flips |
| Knob hover | Value-arc gains a tiny glow boost `rgba(255, 195, 0, 0.6)` |
| Knob drag | Cursor `ns-resize`; numeric readout becomes editable (future v2) |
| Meter over (-3 to 0 dBFS) | Top portion of fill becomes red |
| No signal | Meter at -inf, footer reads `PEAK: -inf dB` |

## Animation Budget
- All transitions ≤ 150 ms.
- Meter updates at 30 Hz (no transitions — direct height changes).
- Knob value-arc updates have a 60 ms transition to smooth automation playback (turned off when the *user* is dragging).

## Accessibility (basic, v1)
- All interactive elements have `aria-label`.
- Focus ring on tab: 2 px amber outline, 2 px offset.
- No reliance on color alone — meter overs also show a small "OVER" pill above the meter when triggered.
