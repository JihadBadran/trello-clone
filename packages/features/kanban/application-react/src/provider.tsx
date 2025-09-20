import type { Action } from '@tc/foundation/actions';
import { createAndStartSync } from '@tc/infra/sync-cloud';
import { tabSync } from '@tc/infra/sync-tabs';
import { makeKanbanStore } from '@tc/kanban/application';
import React, { useEffect } from 'react';

// Import repos for hydration and sync
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import {
  BoardsRepoSupabase
} from '@tc/boards/data';
import {
  CardsRepoSupabase,
  subscribeCardRealtime,
} from '@tc/cards/data';
import type { Card } from '@tc/cards/domain';
import {
  ColumnsRepoSupabase
} from '@tc/columns/data';
import { supabase } from '@tc/infra/supabase';

// 1. Create the store as a module-level singleton
export const kanbanStore = makeKanbanStore({
  publish: (msg: Action) => tabSync.publish({ ...msg, from: tabSync.TAB_ID }),
  tabId: tabSync.TAB_ID,
  dev: true,
});

function useLeaderSync() {
  const repos = kanbanStore((s) => s.repos);

  useEffect(() => {
    if (!repos) return;

    let stopSync: (() => void) | null = null;

    const startKanbanSync = () => {
      return createAndStartSync({
        channels: {
          boards: {
            topic: 'boards',
            local: repos.boards,
            cloud: BoardsRepoSupabase,
          },
          columns: {
            topic: 'columns',
            local: repos.columns,
            cloud: ColumnsRepoSupabase,
          },
          cards: {
            topic: 'cards',
            local: repos.cards,
            cloud: CardsRepoSupabase,
          },
        },
      });
    };

    const unsub = tabSync.onLeaderChange((isLeader) => {
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
  }, [repos]);
}

function useRealtimeSync() {
  const boardId = kanbanStore((s) => s.activeBoardId);
  const upsertBoard = kanbanStore((s) => s.upsertBoard);
  const upsertColumn = kanbanStore((s) => s.upsertColumn);
  const upsertCard = kanbanStore((s) => s.upsertCard);
  console.log('[kanban] useRealtimeSync 0', { boardId });
  const ch = supabase.channel(`all-cards`, {
    config: { broadcast: { self: true } },
  });

  useEffect(() => {
    console.log('[kanban] useRealtimeSync 1', { boardId });
    if (!boardId) return;
    console.log('[kanban] useRealtimeSync 2', { boardId });


    // subscribeBoardsRealtime(ch, (msg: RealtimePostgresChangesPayload<Board>) => {
    //   const row = msg.new ?? msg.old;
    //   if (row) upsertBoard(row as Board);
    // }),
    // subscribeColumns(
    //   boardId,
    //   ch,
    //   (msg: RealtimePostgresChangesPayload<Column>) => {
    //     const row = msg.new ?? msg.old;
    //     if (row) upsertColumn(row as Column);
    //   }
    // ),
    subscribeCardRealtime(
      boardId,
      ch,
      (msg: RealtimePostgresChangesPayload<Card>) => {
        console.log('[kanban] useRealtimeSync 4', { boardId });
        const row = msg.new ?? msg.old;
        if (row) upsertCard(row as Card);
      }
    )

    ch.subscribe((status) => {
      console.log('subscribeCardRealtime => status', status)
    });

    return () => {
      ch.unsubscribe();
    };
  }, [boardId, upsertBoard, upsertColumn, upsertCard]);
}

function useTabSync(
  dispatch: (action: Action, options?: { localOnly?: boolean }) => void
) {
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

// 3. The Provider component now just orchestrates hooks and renders children
export const refreshKanbanData = async () => {
  const store = kanbanStore.getState();
  const [boardsResult, columnsResult, cardsResult] = await Promise.all([
    BoardsRepoSupabase.getAll(),
    ColumnsRepoSupabase.getAll(),
    CardsRepoSupabase.getAll(),
  ]);

  if (boardsResult.ok && boardsResult.rows) {
    store.hydrateBoards(boardsResult.rows);
  }
  if (columnsResult.ok && columnsResult.rows) {
    store.hydrateColumns(columnsResult.rows);
  }
  if (cardsResult.ok && cardsResult.rows) {
    store.hydrateCards(cardsResult.rows);
  }
};

export const KanbanProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = kanbanStore((s) => s.dispatch);
  const setHydrated = kanbanStore((s) => s.setHydrated);
  const setSession = kanbanStore((s) => s.setSession);

  useTabSync(dispatch);
  useLeaderSync();
  useRealtimeSync();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  useEffect(() => {
    (async () => {
      await refreshKanbanData();
      setHydrated(true);
    })();
  }, [setHydrated]);

  return <>{children}</>;
};
