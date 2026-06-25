import { create } from 'zustand'

export interface SpikeItem {
  id: string
  label: string
}

interface SpikeStore {
  items: SpikeItem[]
  bumps: number
  reorder: (from: number, to: number) => void
  bump: () => void
  reset: () => void
}

const initialItems: SpikeItem[] = [
  { id: 'a', label: 'I — Cmaj7' },
  { id: 'b', label: 'vi — Am9' },
  { id: 'c', label: 'IV — F△13' },
  { id: 'd', label: 'V — Gsus4' },
]

export const useSpikeStore = create<SpikeStore>((set) => ({
  items: initialItems,
  bumps: 0,
  reorder: (from, to) =>
    set((s) => {
      const items = s.items.slice()
      const [m] = items.splice(from, 1)
      items.splice(to, 0, m)
      return { items }
    }),
  bump: () => set((s) => ({ bumps: s.bumps + 1 })),
  reset: () => set({ items: initialItems, bumps: 0 }),
}))
