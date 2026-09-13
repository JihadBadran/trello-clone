import React from 'react';
import { kanbanStore } from '@tc/kanban/application-react';
import { Column } from '@tc/columns/domain';

export function useColumnsByBoard(boardId: string) {
  const columns = kanbanStore(s => s.columns);
  return Object.values(columns).filter((c: Column) => c.board_id === boardId);
}

export function useCreateColumn() {
  const dispatch = kanbanStore(s => s.dispatch);
  return React.useCallback(
    (payload: Column) => dispatch({ type: 'columns/create', payload }),
    [dispatch],
  );
}

export function useUpdateColumn() {
  const dispatch = kanbanStore(s => s.dispatch);
  return React.useCallback(
    (payload: Column) => dispatch({ type: 'columns/update', payload }),
    [dispatch],
  );
}

export function useDeleteColumn() {
  const dispatch = kanbanStore(s => s.dispatch);
  return React.useCallback(
    (id: string) => dispatch({ type: 'columns/delete', payload: { id } }),
    [dispatch],
  );
}
