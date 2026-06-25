/**
 * Instrument registry. Each instrument is a Tone.Sampler config: a sparse
 * note-to-mp3 map + envelope settings. Samples live locally under
 * /public/samples/<id>/ so the desktop app can play without network.
 */

export type InstrumentCategory = 'keys' | 'strings' | 'brass' | 'woodwinds'

export interface InstrumentDef {
  id: string
  label: string
  category: InstrumentCategory
  /** Path relative to /public — e.g. '/samples/piano/'. */
  baseUrl: string
  /** Sparse note → file mapping. Tone.Sampler pitch-shifts between them. */
  sampleMap: Record<string, string>
  /** Attack (s). Strings/brass need a soft fade-in. Default 0. */
  attack?: number
  /** Release (s). Default 1.2. */
  release?: number
  /** Master gain offset (dB). Default -6. */
  volume?: number
  /** One-line description shown in the picker / tooltip. */
  description?: string
}

// ── Salamander Grand Piano ───────────────────────────────────────
// Alexander Holm's Salamander Grand Piano V3, CC0. Files are the
// sparse mp3 subset bundled locally (~5 MB).
const SALAMANDER_MAP: Record<string, string> = {
  A0: 'A0.mp3',  C1: 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', A1: 'A1.mp3',
  C2: 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', A2: 'A2.mp3',
  C3: 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', A3: 'A3.mp3',
  C4: 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', A4: 'A4.mp3',
  C5: 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', A5: 'A5.mp3',
  C6: 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', A6: 'A6.mp3',
  C7: 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', A7: 'A7.mp3',
  C8: 'C8.mp3',
}

// ── Sparse maps for the orchestral instruments ──────────────────
// Every ~4 semitones across the instrument's natural range. File
// names use sharp spellings (Ds = D♯) to stay JS-string-friendly.

const FLUTE_MAP: Record<string, string> = {
  C4: 'C4.mp3', E4: 'E4.mp3', 'G#4': 'Gs4.mp3',
  C5: 'C5.mp3', E5: 'E5.mp3', 'G#5': 'Gs5.mp3',
  C6: 'C6.mp3', E6: 'E6.mp3', 'G#6': 'Gs6.mp3',
  C7: 'C7.mp3',
}

// VSCO 2 CE Violin Section (susVib v1). CC-BY 4.0 — attribution required.
// Files are at native pitch (G2–D5); map keys are shifted up an octave so
// playback sounds an octave lower than requested. Keeps strings in a warmer,
// more cinematic range for chord pads instead of feeling shrill.
const STRINGS_MAP: Record<string, string> = {
  G3: 'G2.mp3', A3: 'A2.mp3', B3: 'B2.mp3',
  D4: 'D3.mp3', 'F#4': 'Fs3.mp3', A4: 'A3.mp3',
  C5: 'C4.mp3', E5: 'E4.mp3', G5: 'G4.mp3', B5: 'B4.mp3',
  D6: 'D5.mp3',
}

const TRUMPET_MAP: Record<string, string> = {
  'F#3': 'Fs3.mp3', 'A#3': 'As3.mp3',
  D4: 'D4.mp3', 'F#4': 'Fs4.mp3', 'A#4': 'As4.mp3',
  D5: 'D5.mp3', 'F#5': 'Fs5.mp3', 'A#5': 'As5.mp3',
  D6: 'D6.mp3',
}

// ── Registry ────────────────────────────────────────────────────

export const INSTRUMENTS: InstrumentDef[] = [
  {
    id: 'piano',
    label: 'Grand Piano',
    category: 'keys',
    baseUrl: '/samples/piano/',
    sampleMap: SALAMANDER_MAP,
    release: 1.2,
    volume: -6,
  },
  {
    id: 'flute',
    label: 'Flute',
    category: 'woodwinds',
    baseUrl: '/samples/flute/',
    sampleMap: FLUTE_MAP,
    attack: 0.05,
    release: 0.3,
    volume: -8,
  },
  {
    id: 'strings',
    label: 'Strings',
    category: 'strings',
    baseUrl: '/samples/strings/',
    sampleMap: STRINGS_MAP,
    attack: 0.08,
    release: 1.2,
    volume: 10,
  },
  {
    id: 'trumpet',
    label: 'Trumpet',
    category: 'brass',
    baseUrl: '/samples/trumpet/',
    sampleMap: TRUMPET_MAP,
    attack: 0.06,
    release: 0.3,
    volume: -12,
  },
]

export const INSTRUMENT_MAP: Record<string, InstrumentDef> =
  Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]))

export function getInstrument(id: string): InstrumentDef {
  return INSTRUMENT_MAP[id] ?? INSTRUMENTS[0]
}
