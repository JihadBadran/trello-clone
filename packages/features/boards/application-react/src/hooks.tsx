import React, { useContext, useEffect, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { shallow } from 'zustand/shallow';
import { makeBoardsStore, registerBoardsActions, type BoardsStore } from '@tc/boards/application';
import { BoardsRepoIDB, BoardsRepoSupabase } from '@tc/boards/data';
import { createFeatureStore } from '@tc/infra/store';
import { Board } from '@tc/boards/domain';

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
    return () => feature.cleanup();
  }, [feature]);

  return <BoardsCtx.Provider value={{ store: feature.store, dispatch: feature.store.getState().dispatch, isLeader: feature.isLeader() }}>
    {children}
  </BoardsCtx.Provider>;
};

export function useBoards<T>(
  selector: (s: BoardsStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const store = useContext(BoardsCtx)!.store;
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

export function useBoard(boardId: string) {
  return useBoards(s => s.boards[boardId]);
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
    (input: { id: string; title: string; ownerId: string }) =>
      dispatch({
        type: 'boards/create',
        payload: {
          ...input,
          is_archived: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          owner_id: input.ownerId,
        } satisfies Board,
      }),
    [dispatch],
  );
}

export function useArchiveBoard() {
  const dispatch = useBoardsDispatch();
  return React.useCallback(
    (boardId: string) => dispatch({ type: 'boards/archive', payload: { id: boardId } }),
    [dispatch],
  );
}