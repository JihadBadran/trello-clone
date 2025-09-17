import React, { useMemo, useContext, useEffect } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { makeKanbanStore, type KanbanStore } from '@tc/kanban/application';
import { tabSync } from '@tc/infra/sync-tabs';
import type { Action } from '@tc/foundation/actions';

// Import repos for hydration
import { BoardsRepoIDB } from '@tc/boards/data';
import { ColumnsRepoIDB } from '@tc/columns/data';
import { CardsRepoIDB } from '@tc/cards/data';

/**
 * Subscribes to cross-tab messages and dispatches them to the local store.
 * This ensures that actions performed in one tab are reflected in all other tabs.
 */
function useTabSync(store: import('zustand').StoreApi<KanbanStore>) {
  useEffect(() => {
    const unsub = tabSync.subscribe(async (action) => {
      // Ignore messages from the same tab
      if (action.from === tabSync.TAB_ID) {
        return;
      }
      // Dispatch the action to the local store, marking it as localOnly
      // to prevent it from being re-broadcasted.
      await store.getState().dispatch(action, { localOnly: true });
    });

    return () => {
      unsub();
    };
  }, [store]);
}

// 1. Define the context shape
type KanbanContextValue = {
  store: import('zustand').StoreApi<KanbanStore>;
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

  // Use the new hook to sync tabs
  useTabSync(store);

  return <KanbanContext.Provider value={{ store }}>{children}</KanbanContext.Provider>;
};

// 3. Create the useKanbanStore hook
export function useKanbanStore<T>(
  selector: (state: KanbanStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
) {
  const { store } = useContext(KanbanContext)!;
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState, // server snapshot
    selector,
    equalityFn
  );
}

// 4. Create the useKanbanDispatch hook
export function useKanbanDispatch() {
  const { store } = useContext(KanbanContext)!;
  return store.getState().dispatch;
}
