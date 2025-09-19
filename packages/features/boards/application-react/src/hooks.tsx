import React from 'react';
import { kanbanStore, useKanbanDispatch } from '@tc/kanban/application-react';
import type { Board } from '@tc/boards/domain';
import { v4 as uuid } from 'uuid';

export function useBoard(board_id: string) {
  return kanbanStore(s => s.boards[board_id]);
}

export function useBoardsList(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  const boards = kanbanStore(s => s.boards);
  return Object.values(boards).filter(b => includeArchived ? true : !b.is_archived);
}

export function useCreateBoard() {
  const dispatch = useKanbanDispatch();

  return React.useCallback(
    (input: { title: string }) =>
      dispatch({
        type: 'boards/create',
        payload: {
          ...input,
          id: uuid(),
          is_archived: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        } as Partial<Board>,
      }),
    [dispatch],
  );
}

export function useArchiveBoard() {
  const dispatch = useKanbanDispatch();
  return React.useCallback(
    (board_id: string) => dispatch({ type: 'boards/archive', payload: { id: board_id } }),
    [dispatch],
  );
}