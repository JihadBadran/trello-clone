import React, { useMemo, useEffect, useCallback } from 'react';
import { makeKanbanStore, KanbanStore } from '@tc/kanban/application';
import { tabSync } from '@tc/infra/sync-tabs';
import { createAndStartSync } from '@tc/infra/sync-cloud';
import type { Action } from '@tc/foundation/actions';

// Import repos for hydration and sync
import { BoardsRepoIDB, BoardsRepoSupabase } from '@tc/boards/data';
import { ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { CardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';

function useLeaderSync() {
  useEffect(() => {
    let stopSync: (() => void) | null = null;

    const startKanbanSync = () => {
      return createAndStartSync({
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
      if (isLeader) {
        stopSync = startKanbanSync();
      } else {
        stopSync?.();
        stopSync = null;
      }
    });

    return () => {
      unsub();
      stopSync?.();
    };
  }, []);
}

function useTabSync(dispatch: (action: Action, options?: { localOnly?: boolean }) => void) {
  useEffect(() => {
    const unsub = tabSync.subscribe(async (action) => {
      if (action.from === tabSync.TAB_ID) {
        return;
      }
      await dispatch(action, { localOnly: true });
    });

    return () => {
      unsub();
    };
  }, [dispatch]);
}

export const KanbanContext = React.createContext<{ store: import('zustand').UseBoundStore<import('zustand').StoreApi<KanbanStore>> } | null>(null);

export const KanbanProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useMemo(() => {
    const store = makeKanbanStore({
      publish: (msg: Action) =>
        tabSync.publish({ ...msg, from: tabSync.TAB_ID }),
      tabId: tabSync.TAB_ID,
      dev: true,
    });

    (async () => {
      const [boardsResult, columnsResult, cardsResult] = await Promise.all([
        BoardsRepoIDB.getAll(),
        ColumnsRepoIDB.getAll(),
        CardsRepoIDB.getAll(),
      ]);

      if (boardsResult.ok && boardsResult.rows) {
        store.getState().hydrateBoards(boardsResult.rows);
      }
      if (columnsResult.ok && columnsResult.rows) {
        store.getState().hydrateColumns(columnsResult.rows);
      }
      if (cardsResult.ok && cardsResult.rows) {
        store.getState().hydrateCards(cardsResult.rows);
      }

      store.getState().setHydrated(true);
    })();

    return store;
  }, []);

  const dispatch = useCallback(
    (action: Action, opts?: { localOnly?: boolean }) =>
      store.getState().dispatch(action, opts),
    [store]
  );
  useTabSync(dispatch);
  useLeaderSync();

  return <KanbanContext.Provider value={{ store }}>{children}</KanbanContext.Provider>;
};
