import type { Card } from '@tc/cards/domain';
import { StateCreator } from 'zustand';

export type CardsSlice = {
  cards: Record<string, Card>;
  hydrateCards: (cards: Card[]) => void;
  upsertCard: (card: Card) => void;
  removeCard: (id: string) => void;
  moveCard: (cardId: string, targetColumnId: string, newPosition: number) => void;
};

export const createCardsSlice: StateCreator<CardsSlice, [], [], CardsSlice> = (set) => ({
  cards: {},
  moveCard: (cardId: string, targetColumnId: string, newPosition: number) => {
    console.log('Moving card', cardId, 'to column', targetColumnId, 'at position', newPosition);
    set((state) => {
      const { [cardId]: card, ...rest } = state.cards;
      return { cards: { ...rest, [cardId]: { ...card, column_id: targetColumnId, position: newPosition } } };
    });
  },
  hydrateCards: (cards: Card[]) =>
    set({
      cards: Object.fromEntries(cards.map((c) => [c.id, c])),
    }),
  upsertCard: (card: Card) =>
    set((state) => ({
      cards: { ...state.cards, [card.id]: card },
    })),
  removeCard: (id: string) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.cards;
      return { cards: rest };
    }),
});