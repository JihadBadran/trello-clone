import React, { useMemo, useContext, useEffect, useCallback } from 'react';
import { makeKanbanStore, KanbanStore } from '@tc/kanban/application';
import { tabSync } from '@tc/infra/sync-tabs';
import { createAndStartSync } from '@tc/infra/sync-cloud';
import type { Action } from '@tc/foundation/actions';

// Import repos for hydration and sync
import { BoardsRepoIDB, BoardsRepoSupabase } from '@tc/boards/data';
import { ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { CardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';

/**
 * Subscribes to cross-tab messages and dispatches them to the local store.
 * This ensures that actions performed in one tab are reflected in all other tabs.
 */
/**
 * Wires up the leader election and cloud sync controller.
 * The leader tab is responsible for running the sync process.
 */
function useLeaderSync() {

  useEffect(() => {
    let stopSync: (() => void) | null = null;

    // This function configures and starts the cloud sync process.
    const startKanbanSync = () => {
      return createAndStartSync({
        // pollInterval: 5000,
        channels: {
          boards: {
            topic: 'boards',
            local: BoardsRepoIDB,
            cloud: BoardsRepoSupabase,
          },
          columns: {
            topic: 'columns',
            local: ColumnsRepoIDB,
            cloud: ColumnsRepoSupabase,
          },
          cards: {
            topic: 'cards',
            local: CardsRepoIDB,
            cloud: CardsRepoSupabase,
          },
        },
      });
    };

    const unsub = tabSync.onLeaderChange(isLeader => {
      console.log('[sync] leader change', { isLeader })
      if (isLeader) {
        console.log('[sync] leader → start sync')
        stopSync = startKanbanSync()
      } else {
        console.log('[sync] follower → stop sync')
        stopSync?.()
        stopSync = null
      }
    })

    // Cleanup: unsubscribe, stop sync, and destroy leader to release resources.
    return () => {
      unsub();
      stopSync?.();
      // tabSync.cleanup();
    };
  }, []);
}

function useTabSync(dispatch: (action: Action, options?: { localOnly?: boolean }) => void) {
  useEffect(() => {
    const unsub = tabSync.subscribe(async (action) => {
      console.log('[sync] received action', action)
      // Ignore messages from the same tab
      if (action.from === tabSync.TAB_ID) {
        return;
      }
      // Dispatch the action to the local store, marking it as localOnly
      // to prevent it from being re-broadcasted.
      await dispatch(action, { localOnly: true });
    });

    return () => {
      unsub();
    };
  }, [dispatch]);
}

// 1. Define the context shape
type KanbanContextValue = {
  store: import('zustand').UseBoundStore<import('zustand').StoreApi<KanbanStore>>;
};

export const KanbanContext = React.createContext<KanbanContextValue | null>(null);

// 2. Create the KanbanProvider
export const KanbanProviderInternal = ({ children }: { children: React.ReactNode }) => {
  const store = useMemo(() => {
    const store = makeKanbanStore({
      publish: (msg: Action) =>
        tabSync.publish({ ...msg, from: tabSync.TAB_ID }),
      tabId: tabSync.TAB_ID,
      dev: true,
    });

    // Hydrate all slices
    (async () => {
      const [boards, columns, cards] = await Promise.all([
        BoardsRepoIDB.getAll(),
        ColumnsRepoIDB.getAll(),
        CardsRepoIDB.getAll(),
      ]);
      store.getState().hydrateBoards(boards);
      store.getState().hydrateColumns(columns);
      store.getState().hydrateCards(cards);
    })();

    return store;
  }, []);

  // Wire up cross-tab state synchronization.
  const dispatch = useCallback(
    (action: Action, opts?: { localOnly?: boolean }) =>
      store.getState().dispatch(action, opts),
    [store]
  );
  useTabSync(dispatch);

  // Wire up leader election and cloud sync.
  useLeaderSync();

  return <KanbanContext.Provider value={{ store }}>{children}</KanbanContext.Provider>;
};

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
