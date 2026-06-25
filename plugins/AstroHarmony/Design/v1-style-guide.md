# AstroHarmony — Style Guide v1

Derived 1:1 from `D:\Claude\Sessions\cinematic-composer\app\globals.css` `:root` block (the `--cc-*` cc-dark theme that the running app uses).

## Color Tokens

### Backgrounds & surfaces
| Token | Hex | Usage |
|---|---|---|
| `--cc-bg-deep` | `#0a0a14` | Page background, top-level fill, app body |
| `--cc-bg-base` | `#0f0f1c` | Base layer (rarely visible, behind panels) |
| `--cc-bg-panel` | `#14152a` | TopBar, BottomBar, RightPanel cards |
| `--cc-bg-elev` | `#1d1f3a` | Elevated surfaces, ChordCard backgrounds, hover states |
| `--cc-bg-input` | `#11122a` | Form inputs (dropdowns, sliders track, text fields) |

### Borders
| Token | Hex | Usage |
|---|---|---|
| `--cc-border` | `#2a2d4a` | Standard hairlines, panel borders |
| `--cc-border-soft` | `#1f2138` | Subtle dividers, drag-divider rest state |

### Text
| Token | Hex | Usage |
|---|---|---|
| `--cc-text` | `#e7e6f5` | Primary text, chord names, headings |
| `--cc-text-dim` | `#9b9ab8` | Secondary text, descriptions, labels |
| `--cc-text-mute` | `#5e5e80` | Muted/tertiary, helper text, footer copyright |

### Accent colors
| Token | Hex | Usage |
|---|---|---|
| `--cc-accent` | `#8b7dd9` | Primary purple — main brand color, active states, hover-glow |
| `--cc-accent-d` | `#6d5cc4` | Darker purple, pressed states |
| `--cc-accent-l` | `#a094e3` | Lighter purple, hovers, secondary accents (e.g., wordmark "ASTROHARMONY") |
| `--cc-cyan` | `#7fa8b8` | Dusty teal — diatonic chords, scale highlights, success states |
| `--cc-cyan-d` | `#5a8893` | Darker cyan, pressed/active cyan |
| `--cc-warn` | `#d97757` | Orange — tension chords, warnings |
| `--cc-emotional` | `#c668b8` | Pink — emotional/borrowed chord highlights |
| `--cc-resolution` | `#5ec577` | Green — resolved chords |

### Chord card hues (`cc-card-N`)
Used to tint ChordCard backgrounds based on roman-numeral function or scale source (rotation per card):
| Token | Hex |
|---|---|
| `--cc-card-1` | `#c44a8e` (rose) |
| `--cc-card-2` | `#4a6dc4` (blue) |
| `--cc-card-3` | `#4aa8c4` (teal) |
| `--cc-card-4` | `#c4914a` (amber) |
| `--cc-card-5` | `#c44a4a` (red) |
| `--cc-card-6` | `#7a4ac4` (violet) |

ChordCard backgrounds use these at low alpha (`<color>33` ≈ 20% opacity) over `--cc-bg-elev`, with the full color used for the bottom-left scale tag.

---

## Typography

| Role | Family | Size | Weight | Letter-spacing | Casing |
|---|---|---|---|---|---|
| Brand wordmark ("ASTROHARMONY") | Fraunces | 0.95 rem | 600 | 0.18em | UPPERCASE |
| Section labels ("MOOD", "SUGGESTED NEXT CHORDS") | DM Sans | 0.7 rem | 600 | 0.12em | UPPERCASE |
| ChordCard chord name | Fraunces | 1.7 rem | 500 | normal | as entered |
| Suggestion chord name | Fraunces | 1.4 rem | 500 | normal | as entered |
| Chord button (diatonic grid) | Fraunces | 0.95 rem | 500 | normal | as entered |
| Roman numerals (small) | DM Sans | 0.65 rem | 500 | 0.05em | lowercase preserved (e.g., `iii`, `IV`) |
| Mood title | Fraunces | 0.875 rem | 500 | normal | as entered |
| Mood description | DM Sans | 0.7 rem | 400 | normal | as entered |
| Tempo / BPM number | DM Sans | 1 rem | 500 | normal | numeric |
| Footer / status text | DM Sans | 0.7 rem | 400 | 0.05em | UPPERCASE |
| Body / button text | DM Sans | 0.8 rem | 500 | normal | as entered |

### Font loading
- Bundled inline via Vite (no Google Fonts CDN — plugins can't rely on network at runtime).
- WOFF2 subset: Fraunces 500/600 (Latin), DM Sans 400/500/600 (Latin).
- ~140 KB total fonts added to bundle (acceptable).

---

## Spacing System

| Token | Value | Use |
|---|---|---|
| Grid gap (main content) | 16 px | Between progression / suggestions / picker |
| Card padding (ChordCard) | 14 px | Internal |
| Panel padding | 16 px | Inside TopBar, BottomBar, RightPanel sections |
| Section gap (MoodSidebar) | 6 px | Between mood buttons |
| Inline gap (TopBar clusters) | 12 px | Between adjacent buttons |
| Inline gap (chord row buttons) | 6 px | Between chord buttons in a row |
| Header height (TopBar) | 56 px | Fixed |
| Footer height (BottomBar) | 48 px | Fixed |
| MoodSidebar width | 230 px | Fixed |
| RightPanel default width | 450 px | User-resizable |
| Drag divider | 5 px | Fixed |

## Border Radius

| Element | Radius |
|---|---|
| Cards (ChordCard, suggestion cards) | 10 px |
| Buttons (default) | 8 px |
| Pills (badges, BYPASS-style) | 999 px |
| Sliders track | 99 px |
| Form inputs (dropdowns, text) | 6 px |
| Panel containers | 10 px |

## Shadow System

```css
--shadow-card:   0 2px 8px rgba(0, 0, 0, 0.25);   /* ChordCards at rest */
--shadow-hover:  0 6px 20px rgba(0, 0, 0, 0.4);    /* Cards on hover */
--shadow-active: 0 0 0 2px var(--cc-accent),
                 0 0 12px rgba(139, 125, 217, 0.4); /* Active chord during playback */
--shadow-glow-c: 0 0 8px rgba(127, 168, 184, 0.3); /* Cyan glow (preview hint) */
```

## Components

### Knob (e.g., volume, pitch — though most controls are sliders)
- 36 × 36 px SVG arc rendered via `Math.cos/sin` (no library)
- Background arc: `--cc-bg-input`, 4 px stroke
- Value arc: `--cc-accent`, 4 px stroke, animated via `stroke-dasharray`
- Drag: vertical, `ns-resize`
- (Most AstroHarmony controls are sliders / dropdowns / buttons, not knobs — knobs only used in v2 if added)

### Range slider (volume, pitch, tempo)
- Track: 4 px tall, `--cc-border`, radius 99 px
- Active fill: `--cc-accent` from left
- Thumb: 14 px circle, `--cc-accent`, no border
- Hover thumb: slight glow

### Toggle button (extension Triad/6&7/9/11/13, Loop, etc.)
- Pill-shaped, 6 px radius
- Inactive: `--cc-bg-elev` bg, `--cc-text-dim` text, `--cc-border` border
- Active: `--cc-cyan` bg (or `--cc-accent` depending on context), `--cc-bg-deep` text
- Hover inactive: `--cc-bg-input` bg
- Transition: 120ms ease

### Dropdown (Projects ▾, Root note ▾, Mode ▾, Style ▾)
- Background: `--cc-bg-input`
- Border: 1 px `--cc-border`
- Text: `--cc-text`
- Caret: `--cc-text-dim`, 12 px
- Open state border: `--cc-accent`
- Menu popover: `--cc-bg-panel` bg, soft shadow, 8 px radius, max-height with scroll

### Mini-piano (RightPanel SCALE NOTES section)
- White keys: 18 × 60 px, `--cc-text` fill, `--cc-bg-elev` border
- Black keys: 12 × 38 px, `--cc-bg-input` fill, `--cc-text-mute` border (overlay top-aligned)
- Highlighted (scale note): `--cc-cyan` fill (white key) or `--cc-cyan-d` (black key)
- Highlighted (chord note in CHORD mode): `--cc-accent` fill
- ~2-octave span, ~32 white keys total in default panel width

### Mood button (sidebar)
- 100 × 70 px-ish (card style)
- Layout: emoji (large, top-left) + Title (Fraunces) + Description (DM Sans muted)
- Inactive: `--cc-bg-panel` bg, no border
- Hover: `--cc-bg-elev` bg
- Active: `--cc-bg-elev` bg with 4 px left border `--cc-accent` + subtle inner glow

### ChordCard (progression)
- 190 × 110 px, radius 10 px
- Background: linear-gradient from `--cc-bg-elev` to `var(--cc-card-N, --cc-bg-elev)33`
- Top-left: roman numeral (DM Sans 0.65 rem `--cc-text-mute`)
- Center: chord name (Fraunces 1.7 rem `--cc-text`)
- Bottom-left: scale source tag (DM Sans 0.6 rem uppercase, color = full `--cc-card-N`)
- Bottom-right: bar count badge (e.g., "1bar")
- Hover: `box-shadow --shadow-hover`, scale 1.02, reveal ✕ and ⠿
- Active during playback: `box-shadow --shadow-active`
- Drag-grab cursor: `grab` → `grabbing` while dragging

### Suggestion card (SuggestedChords)
- ~150 × 90 px, radius 8 px
- Background: `--cc-bg-panel` with 1px `--cc-border`
- Top: label (e.g., "Triumphant Open") in DM Sans 0.65 rem `--cc-cyan`
- Center: chord name Fraunces 1.4 rem
- Bottom: roman numeral DM Sans 0.7 rem `--cc-text-dim`
- Star ★ indicator (cyan, top-left) — marker that this is a suggestion
- ＋ add button (right side, 22 px circle)
- Hover: `--cc-bg-elev` bg

### Chord button (diatonic grid)
- 80 × 36 px-ish
- Background: `--cc-bg-elev`
- Border: 1 px `--cc-border`
- Text: Fraunces 0.95 rem `--cc-text`
- Hover: `--cc-bg-input` bg, 1 px `--cc-accent` border
- ＋ add button: 16 px circle to the right, `--cc-accent` fill, `--cc-bg-deep` icon
- Empty cell (sus rows): transparent, `pointer-events: none` — preserves grid alignment

### Progress bar (under ChordCards)
- 4 px tall, full-width gradient `linear-gradient(90deg, --cc-cyan 0%, --cc-emotional 100%)`
- Fill driven by `currentBeatChanged` event (`width: <position01 * 100>%`)
- Subtle box-shadow for depth

---

## States

| State | Visual |
|---|---|
| Default | All accents at base color |
| Plugin focus / hover knob/slider | +1 brightness, glow `--shadow-glow-c` |
| Active mood | Sidebar card with `4px` left border `--cc-accent`, slightly elevated |
| Active ChordCard (playing) | `--shadow-active` ring + glow pulse |
| Disabled (Undo with no history, etc.) | Opacity 0.4, `cursor: not-allowed`, no hover effects |
| Bypassed (host bypass) | Entire UI desaturates to ~50% saturation, top accent dims to `--cc-border` |
| Host-synced (BPM follows DAW) | Tempo display has small `●` cyan dot prefix indicating "live sync" |
| Standalone (DAW stopped) | Tempo display shows `○` muted dot (no live sync) |

## Animations

| Animation | Duration | Easing | Trigger |
|---|---|---|---|
| ChordCard mount | 200 ms | ease-out | DOM insertion |
| Suggestion list refresh | 240 ms (60 ms stagger × 4) | ease-out | Mood / scale changed |
| Mood switch fade | 250 ms | ease-in-out | Mood button click |
| Knob value arc update | 60 ms | linear | Parameter change from automation |
| Hover transitions | 120 ms | ease | Standard |
| Progress bar update | linear, frame-driven | linear | 30 Hz from `currentBeatChanged` |
| Active chord glow pulse | 600 ms | ease-in-out, infinite alternate | While `isActive` |

## Accessibility

- Tab order matches visual order (left→right, top→bottom)
- Focus ring: 2 px `--cc-accent` outline, 2 px offset, never removed even on click-only flow
- All interactive elements have `aria-label`
- All state changes also produce text/icon changes (color is not the sole indicator)
- Minimum tap target: 32 × 32 px (chord button cells generous)

## Performance Budget

- 60 fps interactions on a 4-year-old laptop CPU
- Mood switch: full chord-grid regeneration must complete < 50 ms
- Drag-drop: visual response < 16 ms per frame (1 frame)
- `pushState` debounce: 200 ms (no faster — keeps audio thread + WebView thread loose)
- Bundle size: 1.5 MB hard ceiling (current spike: 249 KB; ~1.0 MB realistic with full UI + fonts)
