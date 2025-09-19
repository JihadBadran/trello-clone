import { useContext } from 'react';
import { KanbanContext } from './provider';
import { KanbanStore } from '@tc/kanban/application';

// 3. Create the useKanbanStore hook
export function useKanbanStore<T>(
  selector: (state: KanbanStore) => T,
) {
  const storeContext = useContext(KanbanContext);
  const state = storeContext?.store((state) => state);
  if (!storeContext || !state) {
    throw new Error('useKanbanStore must be used within a KanbanProvider');
  }
  return selector(state);
}

export function useKanbanBoard(boardId: string) {
  const storeContext = useContext(KanbanContext);
  const state = storeContext?.store((state) => state);
  if (!storeContext || !state) {
    throw new Error('useKanbanBoard must be used within a KanbanProvider');
  }
  return state.boards[boardId];
}

export function useKanbanColumns(boardId: string) {
  const storeContext = useContext(KanbanContext);
  const state = storeContext?.store((state) => state);
  if (!storeContext || !state) {
    throw new Error('useKanbanColumns must be used within a KanbanProvider');
  }
  return Object.values(state.columns).filter(c => c.board_id === boardId);
}

export function useKanbanCards(boardId: string) {
  const storeContext = useContext(KanbanContext);
  const state = storeContext?.store((state) => state);
  if (!storeContext || !state) {
    throw new Error('useKanbanCards must be used within a KanbanProvider');
  }
  return Object.values(state.cards).filter(c => c.board_id === boardId);
}

// 4. Create the useKanbanDispatch hook
export function useKanbanDispatch() {
  const storeContext = useContext(KanbanContext);
  const state = storeContext?.store((state) => state);
  if (!storeContext || !state) {
    throw new Error('useKanbanDispatch must be used within a KanbanProvider');
  }
  return state.dispatch;
}
