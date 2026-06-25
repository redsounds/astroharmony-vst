import type { MoodDefinition } from '../types'
import { EPIC } from './epic'
import { DARK } from './dark'
import { HOPEFUL } from './hopeful'
import { SAD } from './sad'
import { TENSION } from './tension'
import { MYSTERY } from './mystery'
import { FANTASY } from './fantasy'
import { ADVENTURE } from './adventure'
import { LOVE } from './love'
import { HORROR } from './horror'

export const MOODS: Record<string, MoodDefinition> = {
  epic:      EPIC,
  dark:      DARK,
  hopeful:   HOPEFUL,
  sad:       SAD,
  tension:   TENSION,
  mystery:   MYSTERY,
  fantasy:   FANTASY,
  adventure: ADVENTURE,
  love:      LOVE,
  horror:    HORROR,
}

export const MOOD_LIST: MoodDefinition[] = Object.values(MOODS)

export function getMood(id: string): MoodDefinition | null {
  return MOODS[id] ?? null
}
