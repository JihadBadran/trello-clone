import React from 'react';
import { kanbanStore } from '@tc/kanban/application-react';
import type { Card } from '@tc/cards/domain';

export function useCardsByBoard(boardId: string) {
  const cards = kanbanStore(s => s.cards);
  return Object.values(cards).filter((c: Card) => c.board_id === boardId);
}

export function useCreateCard() {
  const dispatch = kanbanStore(s => s.dispatch);
  return React.useCallback(
    (payload: Card) => dispatch({ type: 'cards/upsert', payload }),
    [dispatch],
  );
}

export function useDeleteCard() {
  const dispatch = kanbanStore(s => s.dispatch);
  return React.useCallback(
    (id: string) => dispatch({ type: 'cards/delete', payload: { id } }),
    [dispatch],
  );
}
