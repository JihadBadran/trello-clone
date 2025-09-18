import React, { useContext, useEffect, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { shallow } from 'zustand/shallow';
import { makeBoardsStore, registerBoardsActions, type BoardsStore } from '@tc/boards/application';
import { BoardsRepoIDB, BoardsRepoSupabase, subscribeBoardsRealtime } from '@tc/boards/data';
import { createFeatureStore } from '@tc/infra/store';
import { Board } from '@tc/boards/domain';
import { v4 as uuid } from 'uuid';


type BoardsContext = {
  store: import('zustand').StoreApi<BoardsStore>;
  dispatch: (action: { type: string; payload: any; meta?: any }) => Promise<void>;
  isLeader: boolean;
};

export const BoardsCtx = React.createContext<BoardsContext | null>(null);

export const BoardsProvider = ({ children }: { children: React.ReactNode }) => {
  const feature = useMemo(() => {
    return createFeatureStore({
      makeStore: makeBoardsStore,
      registerActions: registerBoardsActions,
      localRepo: BoardsRepoIDB,
      cloudRepo: BoardsRepoSupabase,
      hydrateFnName: 'hydrateBoards',
      topic: 'boards',
    });
  }, []);

  useEffect(() => {
    // Subscribe to realtime changes for boards
    const unsubRealtime = subscribeBoardsRealtime(async (msg: any) => {
      try {
        const row = msg?.new ?? msg?.old
        if (!row) return
        // Apply into local IDB without enqueuing to outbox
        await BoardsRepoIDB.applyFromCloud(row as any)
        // Update in-memory store (slice has LWW guards)
        feature.store.getState().upsertBoard(row as any)
      } catch (e) {
        console.warn('[boards] realtime apply failed', e)
      }
    })

    return () => { unsubRealtime(); feature.cleanup() };
  }, [feature]);

  return <BoardsCtx.Provider value={{ store: feature.store, dispatch: feature.store.getState().dispatch, isLeader: feature.isLeader() }}>
    {children}
  </BoardsCtx.Provider>;
};

export function useBoards<T>(
  selector: (s: BoardsStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const store = useContext(BoardsCtx)?.store;
  if (!store) throw new Error('useBoards must be used inside <BoardsProvider>');
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState, // server snapshot
    selector,
    equalityFn,
  );
}

export function useBoardsDispatch() {
  const ctx = useContext(BoardsCtx);
  if (!ctx) throw new Error('useBoardsDispatch must be used inside <BoardsProvider>');
  return ctx.dispatch;
}

export function useBoardsIsLeader() {
  const ctx = useContext(BoardsCtx);
  if (!ctx) throw new Error('useBoardsIsLeader must be used inside <BoardsProvider>');
  return ctx.isLeader;
}

export function useBoard(board_id: string) {
  return useBoards<Board>(s => s.boards[board_id]);
}

export function useBoardsList(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  return useBoards(
    s => Object.values(s.boards).filter(b => includeArchived ? true : !b.is_archived),
    shallow,
  );
}

export function useCreateBoard() {
  const dispatch = useBoardsDispatch();

  return React.useCallback(
    (input: { title: string; owner_id: string }) =>
      dispatch({
        type: 'boards/create',
        payload: {
          ...input,
          id: uuid(),
          is_archived: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          owner_id: input.owner_id,
        } satisfies Board,
      }),
    [dispatch],
  );
}

export function useArchiveBoard() {
  const dispatch = useBoardsDispatch();
  return React.useCallback(
    (board_id: string) => dispatch({ type: 'boards/archive', payload: { id: board_id } }),
    [dispatch],
  );
}