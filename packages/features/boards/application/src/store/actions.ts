import type { StoreApi } from 'zustand';
import type { Action, ActionImpl } from '@tc/foundation/actions';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import { createBoardsSlice, type BoardsSlice } from './boards.slice';
import { BoardsRepoIDB } from '@tc/boards/data';
import { Board } from '@tc/boards/domain';

/** Context handed to handlers */
export type BoardsCtx = {
  api: StoreApi<BoardsSlice>;
  repos: { boards: typeof BoardsRepoIDB };
  publish: (msg: { from: string; type: string; payload: any; meta?: any }) => void;
  tabId: string;
};

export type BoardsStore = BoardsSlice & SliceActionsApi<BoardsCtx>;

/** Middleware factory for the Boards slice */
export const withBoardsActions = (deps: {
  publish: (action: Action) => void;
  tabId: string;
  dev?: boolean;
}) =>
  withActionsSlice<BoardsSlice, BoardsCtx>({
    dev: deps.dev,
    makeCtx: (api) => ({
      api,
      repos: { boards: BoardsRepoIDB },
      publish: deps.publish,
      tabId: deps.tabId,
    }),
  });

/** Register default Boards actions */
export function registerBoardsActions(store: StoreApi<BoardsStore>) {
  const register = store.getState().register!;

  // boards/create
  const createBoard: ActionImpl<Action<Board>, BoardsCtx> = {
    toLocal: ({ api }, { payload, type }: Action<Board>) => {
      api.getState().upsertBoard({ ...payload, is_archived: false, updated_at: new Date().toISOString() });
    },
    toPersist: async ({ repos }, { payload, type }: Action<Board>) => {
      console.log("toPersist createBoard: ", payload, type);
      await repos.boards.upsert({ ...payload, is_archived: false, updated_at: new Date().toISOString() });
    },
  };

  // boards/archive
  const archiveBoard: ActionImpl<Action<{ id: string }>, BoardsCtx> = {
    toLocal: ({ api }, { payload }: Action<{ id: string }>) => {
      const b = api.getState().boards[payload.id];
      if (!b) return;
      api.getState().upsertBoard({ ...b, is_archived: true, updated_at: new Date().toISOString() });
    },
    toPersist: async ({ repos }, { payload }: Action<{ id: string }>) => {
      await repos.boards.archive(payload.id);
    },
  };

  const updateBoard: ActionImpl<Action<Board>, BoardsCtx> = {
    toLocal: ({ api }, { payload }: Action<Board>) => {
      api.getState().upsertBoard({ ...payload, updated_at: new Date().toISOString() });
    },
    toPersist: async ({ repos }, { payload }: Action<Board>) => {
      await repos.boards.upsert({ ...payload, updated_at: new Date().toISOString() });
    },
  };

  register('boards/create', createBoard);
  register('boards/archive', archiveBoard);
  register('boards/update', updateBoard);
}

/** Convenience factory to build a standalone Boards store */

export const makeBoardsStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) => {
  return (set: StoreApi<BoardsStore>['setState'], get: StoreApi<BoardsStore>['getState'], api: StoreApi<BoardsStore>) => {
    const slice = createBoardsSlice(set, get, api);
    const sliceWithActions = withBoardsActions(deps)(() => slice);
    return sliceWithActions(set, get, api);
  };
};