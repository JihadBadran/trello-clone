import React, { useEffect } from 'react';
import { makeKanbanStore } from '@tc/kanban/application';
import { tabSync } from '@tc/infra/sync-tabs';
import { createAndStartSync } from '@tc/infra/sync-cloud';
import type { Action } from '@tc/foundation/actions';

// Import repos for hydration and sync
import {
  BoardsRepoSupabase,
  subscribeBoardsRealtime,
} from '@tc/boards/data';
import {
  ColumnsRepoSupabase,
  subscribeColumns,
} from '@tc/columns/data';
import {
  CardsRepoSupabase,
  subscribeCardRealtime,
} from '@tc/cards/data';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Board } from '@tc/boards/domain';
import type { Column } from '@tc/columns/domain';
import type { Card } from '@tc/cards/domain';
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

  useEffect(() => {
    if (!boardId) return;

    const subscriptions = [
      subscribeBoardsRealtime((msg: RealtimePostgresChangesPayload<Board>) => {
        const row = msg.new ?? msg.old;
        if (row) upsertBoard(row as Board);
      }),
      subscribeColumns(
        boardId,
        (msg: RealtimePostgresChangesPayload<Column>) => {
          const row = msg.new ?? msg.old;
          if (row) upsertColumn(row as Column);
        }
      ),
      subscribeCardRealtime(
        boardId,
        (msg: RealtimePostgresChangesPayload<Card>) => {
          const row = msg.new ?? msg.old;
          if (row) upsertCard(row as Card);
        }
      ),
    ];

    return () => {
      subscriptions.forEach((unsub) => unsub());
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
export const KanbanProvider = ({ children }: { children: React.ReactNode }) => {
  const repos = kanbanStore((s) => s.repos);
  const dispatch = kanbanStore((s) => s.dispatch);
  const hydrateBoards = kanbanStore((s) => s.hydrateBoards);
  const hydrateColumns = kanbanStore((s) => s.hydrateColumns);
  const hydrateCards = kanbanStore((s) => s.hydrateCards);
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
      if (!repos) return;
      const [boardsResult, columnsResult, cardsResult] = await Promise.all([
        repos.boards.getAll(),
        repos.columns.getAll(),
        repos.cards.getAll(),
      ]);

      if (boardsResult.ok && boardsResult.rows) {
        hydrateBoards(boardsResult.rows);
      }
      if (columnsResult.ok && columnsResult.rows) {
        hydrateColumns(columnsResult.rows);
      }
      if (cardsResult.ok && cardsResult.rows) {
        hydrateCards(cardsResult.rows);
      }

      setHydrated(true);
    })();
  }, [repos, hydrateBoards, hydrateColumns, hydrateCards, setHydrated]);

  return <>{children}</>;
};
