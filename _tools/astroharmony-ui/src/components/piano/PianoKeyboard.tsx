
interface Props {
  highlightedNotes: string[]
  noteMode?: 'scale' | 'chord'
  bassNote?: string | null
  voicedNotes?: string[] // e.g. ['E4', 'G4', 'C5'] — octave-specific positions
}

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_PATTERN = [
  { note: 'C#', offset: 0 },
  { note: 'D#', offset: 1 },
  { note: 'F#', offset: 3 },
  { note: 'G#', offset: 4 },
  { note: 'A#', offset: 5 },
]

const ENHARMONIC: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B',
  'E#': 'F', 'B#': 'C',
  // Double-accidentals — Tonal occasionally returns these for unusual chord
  // spellings (e.g. B♯°7's bb7 = G##). Without these entries the affected
  // notes would silently drop from the piano render.
  'C##': 'D', 'D##': 'E', 'E##': 'F#', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'C#',
  Dbb: 'C', Ebb: 'D', Fbb: 'D#', Gbb: 'F', Abb: 'G', Bbb: 'A', Cbb: 'A#',
}

const OCTAVES = 6
const TOTAL_WHITES = OCTAVES * 7 + 1
const W = 14, B_W = 9, W_H = 68, B_H = 42
const TOTAL_W = TOTAL_WHITES * W
const BASE_OCT = 1 // piano spans C1..C7 so deep bass voicings stay visible

const COLOR_CYAN_WHITE = '#7fa8b8'
const COLOR_CYAN_BLACK = '#5a8893'
const COLOR_PINK_WHITE = '#c4869a'
const COLOR_PINK_BLACK = '#9b5a6b'

function normalize(note: string) {
  // Strip unicode glyphs so the ENHARMONIC lookup (which uses ASCII keys)
  // hits even when chord notes come in with ♯/♭/𝄪/𝄫 already substituted.
  const ascii = note
    .replace(/𝄪/g, '##').replace(/𝄫/g, 'bb')
    .replace(/♯/g, '#').replace(/♭/g, 'b')
  return ENHARMONIC[ascii] ?? ascii
}

function parseVoicedNote(n: string): { note: string; octIdx: number } | null {
  // Accept single + double accidentals and unicode glyphs.
  const match = n.match(/^([A-G](?:##|bb|[#b♯♭]|𝄪|𝄫)?)(\d+)$/)
  if (!match) return null
  return { note: normalize(match[1]), octIdx: parseInt(match[2]) - BASE_OCT }
}

type KeyColor = 'cyan' | 'pink' | null

export default function PianoKeyboard({ highlightedNotes, noteMode = 'scale', bassNote, voicedNotes }: Props) {
  const hi = new Set(highlightedNotes.map(normalize))
  const bassNorm = bassNote ? normalize(bassNote) : null

  // Build a set of "note:octIdx" keys from voicedNotes for precise chord positioning
  const voicedSet = new Set<string>()
  if (voicedNotes && noteMode === 'chord') {
    for (const vn of voicedNotes) {
      const parsed = parseVoicedNote(vn)
      if (parsed) voicedSet.add(`${parsed.note}:${parsed.octIdx}`)
    }
  }

  // Separate bass positions from chord positions. The bass is the LOWEST
  // occurrence of `bassNorm` in the voicing — picking it by lowest octave
  // rather than by index lets us handle voicings where ensureBassLowest
  // early-returned without prepending (e.g. when the chord already sits at
  // the bass register), and voicings where the bass pitch class also
  // appears higher up in the chord.
  const bassPositions = new Set<string>()
  const chordPositions = new Set<string>()
  if (voicedNotes && noteMode === 'chord') {
    const parsed = voicedNotes.map(parseVoicedNote).filter((p): p is { note: string; octIdx: number } => !!p)
    let lowestBassOct: number | null = null
    if (bassNorm) {
      for (const p of parsed) {
        if (p.note === bassNorm && (lowestBassOct === null || p.octIdx < lowestBassOct)) {
          lowestBassOct = p.octIdx
        }
      }
    }
    for (const p of parsed) {
      const isBass = bassNorm && p.note === bassNorm && p.octIdx === lowestBassOct
      if (isBass) bassPositions.add(`${p.note}:${p.octIdx}`)
      else chordPositions.add(`${p.note}:${p.octIdx}`)
    }
  }

  function keyColor(note: string, octIdx: number): KeyColor {
    const normNote = normalize(note)
    const key = `${normNote}:${octIdx}`

    // Bass note coloured pink at its exact voiced position.
    if (bassPositions.has(key)) return 'pink'

    if (noteMode === 'scale') {
      if (!hi.has(normNote)) return null
      return 'cyan'
    }

    // Chord mode: precise voiced positions
    if (chordPositions.size > 0) {
      if (chordPositions.has(key)) return 'cyan'
      return null
    }

    // Fallback when no voicedNotes given: highlight every octave by pitch class
    if (!hi.has(normNote)) return null
    return 'cyan'
  }

  const whites: { note: string; pos: number; isC: boolean; octave: number; octIdx: number }[] = []
  for (let oct = 0; oct < OCTAVES; oct++) {
    WHITE_NOTES.forEach((note, i) => {
      whites.push({ note, pos: oct * 7 + i, isC: note === 'C', octave: oct + BASE_OCT, octIdx: oct })
    })
  }
  whites.push({ note: 'C', pos: OCTAVES * 7, isC: true, octave: BASE_OCT + OCTAVES, octIdx: OCTAVES })

  const blacks: { note: string; whitePos: number; octIdx: number }[] = []
  for (let oct = 0; oct < OCTAVES; oct++) {
    BLACK_PATTERN.forEach(({ note, offset }) => {
      blacks.push({ note, whitePos: oct * 7 + offset, octIdx: oct })
    })
  }

  return (
    <svg
      viewBox={`0 0 ${TOTAL_W} ${W_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* White keys */}
      {whites.map(({ note, pos, isC, octave, octIdx }) => {
        const color = keyColor(note, octIdx)
        const fill = color === 'pink' ? COLOR_PINK_WHITE : color === 'cyan' ? COLOR_CYAN_WHITE : '#fff'
        const x = pos * W
        return (
          <g key={pos}>
            <rect
              x={x + 1} y={0}
              width={W - 2} height={W_H}
              fill={fill}
              stroke="#d4ccc0" rx={2}
            />
            {isC && (
              <text
                x={x + W / 2} y={W_H - 5}
                textAnchor="middle" fontSize={7}
                fill={color ? '#fff' : '#bbb'}
                fontFamily="DM Sans, sans-serif"
              >
                C{octave}
              </text>
            )}
          </g>
        )
      })}

      {/* Black keys */}
      {blacks.map(({ note, whitePos, octIdx }) => {
        const color = keyColor(note, octIdx)
        const fill = color === 'pink' ? COLOR_PINK_BLACK : color === 'cyan' ? COLOR_CYAN_BLACK : '#2a1f3d'
        const x = (whitePos + 1) * W - B_W / 2
        return (
          <rect
            key={`${whitePos}-${note}`}
            x={x} y={0}
            width={B_W} height={B_H}
            fill={fill}
            rx={2}
          />
        )
      })}
    </svg>
  )
}
