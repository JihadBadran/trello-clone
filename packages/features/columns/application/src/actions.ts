import type { StoreApi } from 'zustand';
import type { ActionImpl } from '@tc/foundation/actions';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import { createColumnsSlice, type ColumnsSlice } from './columns.slice';
import { Action } from '@tc/foundation/actions';
import { ISODateTime } from '@tc/foundation/types';
import { Column, ColumnsRepo } from '@tc/columns/domain';
import { ColumnsRepoIDB } from '@tc/columns/data';

/** Context handed to handlers */
export type ColumnsCtx = {
  api: StoreApi<ColumnsStore>;
  repos: { columns: ColumnsRepo };
  publish: (action: Action) => void;
  tabId: string;
};

export type ColumnsStore = ColumnsSlice & SliceActionsApi<ColumnsCtx>;

/** Middleware factory for the Columns slice */
export const withColumnsActions = (deps: {
  publish: ColumnsCtx['publish'];
  tabId: string;
  dev?: boolean;
}) =>
  withActionsSlice<ColumnsStore, ColumnsCtx>({
    makeCtx: (api) => ({
      api,
      repos: { columns: ColumnsRepoIDB },
      publish: deps.publish,
      tabId: deps.tabId,
    }),
    dev: deps.dev,
  });

/** Register default Columns actions */
export function registerColumnsActions(store: StoreApi<ColumnsStore>) {
  const register = store.getState().register;
  if (!register) return;

  const createColumn: ActionImpl<{ type: 'columns/create'; payload: Column }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().upsertColumn({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toPersist: async ({ repos }, { payload }) => {
      await repos.columns.upsert({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  const updateColumn: ActionImpl<{ type: 'columns/update'; payload: Column }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().upsertColumn({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toPersist: async ({ repos }, { payload }) => {
      await repos.columns.upsert({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  const deleteColumn: ActionImpl<{ type: 'columns/delete'; payload: { id: string } }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().removeColumn(payload.id);
    },
    toPersist: async ({ repos }, { payload }) => {
      await repos.columns.remove(payload.id);
    },
  };

  const resequence: ActionImpl<{ type: 'columns/resequence', payload: { boardId: string, columnId: string, newPosition: number } }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      const column = api.getState().columns[payload.columnId];
      if (column) {
        api.getState().upsertColumn({ ...column, position: payload.newPosition, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
    toPersist: async ({ repos }, { payload }) => {
      const column = await repos.columns.get(payload.columnId);
      if (column) {
        await repos.columns.upsert({ ...column, position: payload.newPosition, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
  };

  register('columns/create', createColumn as any);
  register('columns/update', updateColumn as any);
  register('columns/delete', deleteColumn as any);
  register('columns/resequence', resequence as any);
}

/** Convenience factory to build a standalone Columns store */
export const makeColumnsStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) =>
  ((set: StoreApi<ColumnsStore>['setState'], get: StoreApi<ColumnsStore>['getState'], api: StoreApi<ColumnsStore> & SliceActionsApi<ColumnsCtx>) => {
    const withMw = withColumnsActions(deps)(createColumnsSlice as any);
    return withMw(set, get, api);
  }) as any;
