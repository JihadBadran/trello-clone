import type { StateCreator } from 'zustand'
import { compareLww } from '@tc/foundation/utils'
import type { Card } from '../../domain/src/ports'

export type CardsSlice = {
  cards: Record<string, Card>
  hydrateCards: (rows: Card[]) => void
  upsertCard: (row: Card) => void
  removeCard: (id: string) => void
}

export const createCardsSlice: StateCreator<CardsSlice, [], [], CardsSlice> = (set) => ({
  cards: {},
  hydrateCards: (rows) => set(s => {
    const next = { ...s.cards }
    for (const r of rows) if (!r.deletedAt) next[r.id] = r
    return { cards: next }
  }),
  upsertCard: (row) => set(s => {
    if (row.deletedAt) {
      const { [row.id]: _, ...rest } = s.cards; return { cards: rest }
    }
    const cur = s.cards[row.id]
    if (!cur || compareLww(cur, row) < 0) return { cards: { ...s.cards, [row.id]: row } }
    return s
  }),
  removeCard: (id) => set(s => {
    const { [id]: _, ...rest } = s.cards; return { cards: rest }
  })
})