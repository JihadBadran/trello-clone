import React, { useEffect } from 'react';
import { makeKanbanStore } from '@tc/kanban/application';
import { supabase } from '@tc/infra/supabase';
import { BoardsRepoIDB } from '@tc/boards/data';
import { CardsRepoIDB, subscribeCardRealtime } from '@tc/cards/data';
import { ColumnsRepoIDB } from '@tc/columns/data';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Card } from '@tc/cards/domain';

// 1. Module-level singleton store (tab-bridge creates instance during creation)
export const kanbanStore = makeKanbanStore();

// 2. Hydrate from IDB on first load
export const refreshKanbanData = async () => {
  const store = kanbanStore.getState();
  const [boardsResult, columnsResult, cardsResult] = await Promise.all([
    new BoardsRepoIDB().getAll(),
    new ColumnsRepoIDB().getAll(),
    new CardsRepoIDB().getAll(),
  ]);
  if (boardsResult.ok && boardsResult.rows) store.hydrateBoards(boardsResult.rows);
  if (columnsResult.ok && columnsResult.rows) store.hydrateColumns(columnsResult.rows);
  if (cardsResult.ok && cardsResult.rows) store.hydrateCards(cardsResult.rows);
};

// 3. Realtime sync (Supabase)
function useRealtimeSync() {
  const boardId = kanbanStore((s) => s.activeBoardId);
  const upsertCard = kanbanStore((s) => s.upsertCard);
  const ch = supabase.channel('all-cards', {
    config: { broadcast: { self: true } },
  });

  useEffect(() => {
    if (!boardId) return;

    subscribeCardRealtime(
      boardId,
      ch,
      (msg: RealtimePostgresChangesPayload<Card>) => {
        const row = msg.new ?? msg.old;
        if (row) upsertCard(row as Card);
      }
    );

    ch.subscribe(() => {});

    return () => {
      ch.unsubscribe();
    };
  }, [boardId, upsertCard]);
}

// 4. Provider
export const KanbanProvider = ({ children }: { children: React.ReactNode }) => {
  const setHydrated = kanbanStore((s) => s.setHydrated);
  const setSession = kanbanStore((s) => s.setSession);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [setSession]);

  // Hydrate from IDB
  useEffect(() => {
    (async () => {
      await refreshKanbanData();
      setHydrated(true);
    })();
  }, [setHydrated]);

  // Realtime
  useRealtimeSync();

  return <>{children}</>;
};
