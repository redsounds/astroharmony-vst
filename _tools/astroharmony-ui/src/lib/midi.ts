/**
 * MIDI export — turn the current ChordEntry[] into a standard MIDI
 * Format-0 file and trigger a browser download.
 *
 * Pure utility; no React, no store. The caller passes everything it
 * needs (progression + tempo + voicing helper).
 */

import type { ChordEntry } from '@/types/music'
import { getVoicedNotes } from '@/lib/audio'

// ── Constants ──────────────────────────────────────────────────────

const TICKS_PER_QUARTER = 480           // common high-resolution PPQ
const TICKS_PER_BAR = TICKS_PER_QUARTER * 4
const NOTE_VELOCITY = 90
const RELEASE_GAP_TICKS = 6             // small note-off lead-in so DAWs don't run notes into the next chord
const CHANNEL = 0                       // MIDI ch 1

// Map note letters to semitone offset above C.
const NOTE_OFFSET: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4,
  'E#': 5, F: 5,
  'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0,
}

// ── Helpers ────────────────────────────────────────────────────────

// Double-accidental → single-accidental fallback so unusual chord spellings
// (G##, Dbb, ♯/♭ unicode glyphs) still get exported to MIDI correctly.
const DOUBLE_ACCIDENTAL: Record<string, string> = {
  'C##': 'D', 'D##': 'E', 'E##': 'F#', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'C#',
  Dbb: 'C', Ebb: 'D', Fbb: 'D#', Gbb: 'F', Abb: 'G', Bbb: 'A', Cbb: 'A#',
}

function normalizeAccidentals(note: string): string {
  const ascii = note
    .replace(/𝄪/g, '##').replace(/𝄫/g, 'bb')
    .replace(/♯/g, '#').replace(/♭/g, 'b')
  return DOUBLE_ACCIDENTAL[ascii] ?? ascii
}

function noteToMidi(note: string): number | null {
  const m = note.match(/^([A-G](?:##|bb|[#b♯♭]|𝄪|𝄫)?)(-?\d+)$/)
  if (!m) return null
  const pitch = normalizeAccidentals(m[1])
  const offset = NOTE_OFFSET[pitch]
  if (offset == null) return null
  const oct = parseInt(m[2], 10)
  const midi = (oct + 1) * 12 + offset
  return midi >= 0 && midi <= 127 ? midi : null
}

/** Variable-length quantity used by MIDI delta-times. */
function vlq(value: number): number[] {
  if (value < 0) value = 0
  if (value === 0) return [0]
  const bytes: number[] = []
  let v = value
  while (v > 0) {
    bytes.push(v & 0x7F)
    v >>= 7
  }
  // mark all but the last byte with the continuation bit
  for (let i = bytes.length - 1; i > 0; i--) bytes[i] |= 0x80
  return bytes.reverse()
}

function u16be(v: number): number[] { return [(v >> 8) & 0xFF, v & 0xFF] }
function u32be(v: number): number[] {
  return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF]
}

function asciiBytes(s: string): number[] { return Array.from(s, c => c.charCodeAt(0)) }

// ── Builder ────────────────────────────────────────────────────────

interface BuildOpts {
  progression: ChordEntry[]
  tempo: number
  trackName?: string
  /** Playback transpose in semitones. Applied to every note before it goes
   *  into the .mid bytes so the exported file plays back identically to
   *  what the user heard inside the app. Does NOT change chord.notes. */
  transpose?: number
}

export function buildMidiFile({ progression, tempo, trackName = 'AstroHarmony', transpose = 0 }: BuildOpts): Uint8Array {
  const events: number[] = []
  let lastTick = 0

  // Meta: track name
  events.push(...vlq(0), 0xFF, 0x03, ...vlq(trackName.length), ...asciiBytes(trackName))
  // Meta: tempo (microseconds per quarter)
  const microsecPerQuarter = Math.max(1, Math.round(60_000_000 / Math.max(20, tempo)))
  events.push(
    ...vlq(0), 0xFF, 0x51, 0x03,
    (microsecPerQuarter >> 16) & 0xFF,
    (microsecPerQuarter >> 8) & 0xFF,
    microsecPerQuarter & 0xFF,
  )
  // Meta: time signature 4/4
  events.push(...vlq(0), 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08)

  let cursor = 0
  for (const chord of progression) {
    const bars = chord.bars ?? 1
    const durationTicks = Math.round(bars * TICKS_PER_BAR)
    const voiced = getVoicedNotes(
      chord.notes,
      chord.inversion ?? 'root',
      chord.drop2 ?? false,
      chord.bassNote ?? null,
      chord.voicingType ?? 'standard',
    )
    const midiNotes = voiced
      .map(noteToMidi)
      .filter((n): n is number => n != null)
      .map(n => n + transpose)
      .filter(n => n >= 0 && n <= 127)
    if (midiNotes.length === 0) {
      cursor += durationTicks
      continue
    }

    // Note-on for every chord tone at cursor
    let isFirst = true
    for (const note of midiNotes) {
      const delta = isFirst ? cursor - lastTick : 0
      events.push(...vlq(delta), 0x90 | CHANNEL, note, NOTE_VELOCITY)
      isFirst = false
    }
    lastTick = cursor

    // Note-off slightly before the next chord so notes don't glue together
    const offTick = cursor + Math.max(1, durationTicks - RELEASE_GAP_TICKS)
    isFirst = true
    for (const note of midiNotes) {
      const delta = isFirst ? offTick - lastTick : 0
      events.push(...vlq(delta), 0x80 | CHANNEL, note, 0)
      isFirst = false
    }
    lastTick = offTick
    cursor += durationTicks
  }

  // Meta: end of track (delta 0)
  events.push(...vlq(Math.max(0, cursor - lastTick)), 0xFF, 0x2F, 0x00)

  // Assemble header + track
  const header = [
    ...asciiBytes('MThd'),
    ...u32be(6),
    ...u16be(0),                  // format 0 — single multichannel track
    ...u16be(1),                  // 1 track
    ...u16be(TICKS_PER_QUARTER),  // division
  ]
  const trackBody = events
  const track = [
    ...asciiBytes('MTrk'),
    ...u32be(trackBody.length),
    ...trackBody,
  ]
  return new Uint8Array([...header, ...track])
}

// ── Browser download ──────────────────────────────────────────────

export function downloadMidi(filename: string, data: Uint8Array): void {
  // Wrap the typed array so the Blob ctor accepts it cleanly across DOM lib versions.
  const blob = new Blob([data.slice().buffer], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Free the object URL once the click has been handled
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportProgressionAsMidi(opts: BuildOpts & { filename?: string }): boolean {
  if (opts.progression.length === 0) return false
  const data = buildMidiFile(opts)
  downloadMidi(opts.filename ?? safeFilename(opts.trackName ?? 'cinematic-composer'), data)
  return true
}

function safeFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'cinematic-composer'
}
