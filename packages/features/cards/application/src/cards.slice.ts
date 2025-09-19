import type { StateCreator } from 'zustand';
import { compareLww as compareLwwCamelCase } from '@tc/foundation/utils';
import type { Card } from '@tc/cards/domain';

// Normalize LWW compare to use `updated_at` from Card
const compareLww = (a: Card, b: Card) =>
  compareLwwCamelCase(
    { ...a, updatedAt: a?.updated_at },
    { ...b, updatedAt: b?.updated_at },
  );

export type CardsSlice = {
  cards: Record<string, Card>;
  hydrateCards: (rows: Card[]) => void;
  upsertCard: (row: Card) => void;
  removeCard: (id: string) => void;
};

export const createCardsSlice: StateCreator<CardsSlice, [], [], CardsSlice> = (set) => ({
  cards: {},
  hydrateCards: (rows) =>
    set((s) => {
      const next = { ...s.cards };
      for (const r of rows) {
        if (r.deleted_at) continue;
        const cur = s.cards[r.id];
        if (!cur || compareLww(cur, r) < 0) {
          next[r.id] = r;
        }
      }
      return { cards: next };
    }),
  upsertCard: (row) =>
    set((s) => {
      if (row.deleted_at) {
        const { [row.id]: _, ...rest } = s.cards;
        return { cards: rest };
      }
      const cur = s.cards[row.id];
      if (!cur || compareLww(cur, row) < 0) {
        return { cards: { ...s.cards, [row.id]: row } };
      }
      return s;
    }),
  removeCard: (id) =>
    set((s) => {
      const { [id]: _, ...rest } = s.cards;
      return { cards: rest };
    }),
});