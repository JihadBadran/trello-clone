import { kanbanStore, refreshKanbanData } from './provider';

export function useRefreshKanban() {
  return refreshKanbanData;
}
import type { Column } from '@tc/columns/domain';
import type { Card } from '@tc/cards/domain';


export function useKanbanDispatch() {
  return kanbanStore(s => s.dispatch);
}

export function useKanbanBoard(boardId: string) {
  return kanbanStore(s => s.boards[boardId]);
}

export function useKanbanColumns(boardId: string) {
  const columns = kanbanStore(s => s.columns);
  return Object.values(columns).filter((c: Column) => c.board_id === boardId);
}

export function useKanbanCards(boardId: string) {
  const cards = kanbanStore(s => s.cards);
  return Object.values(cards).filter((c: Card) => c.board_id === boardId);
}
