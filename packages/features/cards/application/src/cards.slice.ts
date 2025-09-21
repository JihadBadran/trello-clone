import type { Card } from '@tc/cards/domain';
import { StateCreator } from 'zustand';

export type CardsSlice = {
  cards: Record<string, Card>;
  hydrateCards: (cards: Card[]) => void;
  upsertCard: (card: Card) => void;
  removeCard: (id: string) => void;
  moveCard: (cardId: string, targetColumnId: string, newPosition: number, withRepositioning?: boolean) => void;
};

export const createCardsSlice: StateCreator<CardsSlice, [], [], CardsSlice> = (set, get) => ({
  cards: {},
  moveCard: (cardId: string, targetColumnId: string, newPosition: number, withRepositioning = false) => {
    console.log('Moving card', cardId, 'to column', targetColumnId, 'at position', newPosition);
    if (withRepositioning) {
      // loop over all cards in the target column and update their position
      const cardsInTargetColumn = Object.values(get().cards).filter((c) => c.column_id === targetColumnId);
      const updatedCards = cardsInTargetColumn.map((c, index) => ({ ...c, position: index * 100 }));
      updatedCards.forEach((c) => {
        set((state) => ({
          cards: { ...state.cards, [c.id]: c },
        }));
      });
    } else {
      set((state) => {
        const { [cardId]: card, ...rest } = state.cards;
        return { cards: { ...rest, [cardId]: { ...card, column_id: targetColumnId, position: newPosition } } };
      });
    }
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