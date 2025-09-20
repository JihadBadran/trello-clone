import type { StoreApi } from 'zustand';
import type { ActionImpl } from '@tc/foundation/actions';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import { createColumnsSlice, type ColumnsSlice } from './columns.slice';
import { Action } from '@tc/foundation/actions';
import { ISODateTime } from '@tc/foundation/types';
import { Column } from '@tc/columns/domain';
import { ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { FeatureRepo } from '@tc/foundation/types';

/** Context handed to handlers */
export type ColumnsCtx = {
  api: StoreApi<ColumnsStore>;
  repos: { columns: FeatureRepo<Column> };
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
      repos: { columns: new ColumnsRepoIDB() },
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
      await (repos.columns as ColumnsRepoIDB).putLocal({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toCloud: async (_, { payload }) => {
      await ColumnsRepoSupabase.upsert({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  const updateColumn: ActionImpl<{ type: 'columns/update'; payload: Column }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().upsertColumn({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toPersist: async ({ repos }, { payload }) => {
      await (repos.columns as ColumnsRepoIDB).putLocal({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toCloud: async (_, { payload }) => {
      await ColumnsRepoSupabase.upsert({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  const deleteColumn: ActionImpl<{ type: 'columns/delete'; payload: { id: string } }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().removeColumn(payload.id);
    },
    toPersist: async ({ repos }, { payload }) => {
      await (repos.columns as ColumnsRepoIDB).removeLocal(payload.id);
    },
    toCloud: async (_, { payload }) => {
      await ColumnsRepoSupabase.remove(payload.id);
    },
  };

  const updateTitle: ActionImpl<{ type: 'columns/updateTitle', payload: { id: string, title: string } }, ColumnsCtx> = {
    toLocal: ({ api }, { payload }) => {
      const column = api.getState().columns[payload.id];
      if (column) {
        api.getState().upsertColumn({ ...column, title: payload.title, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
    toPersist: async ({ repos }, { payload }) => {
      const column = await repos.columns.get(payload.id);
      if (column) {
        await (repos.columns as ColumnsRepoIDB).putLocal({ ...column, title: payload.title, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
    toCloud: async ({ repos }, { payload }) => {
      const column = await repos.columns.get(payload.id);
      if (column) {
        await ColumnsRepoSupabase.upsert({ ...column, title: payload.title, updated_at: new Date().toISOString() as ISODateTime });
      }
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
        await (repos.columns as ColumnsRepoIDB).putLocal({ ...column, position: payload.newPosition, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
    toCloud: async ({ repos }, { payload }) => {
      const column = await repos.columns.get(payload.columnId);
      if (column) {
        await ColumnsRepoSupabase.upsert({ ...column, position: payload.newPosition, updated_at: new Date().toISOString() as ISODateTime });
      }
    },
  };

  register('columns/create', createColumn as ActionImpl<{ type: 'columns/create'; payload: Column; }, ColumnsCtx>);
  register('columns/update', updateColumn as ActionImpl<{ type: 'columns/update'; payload: Column; }, ColumnsCtx>);
  register('columns/delete', deleteColumn as ActionImpl<{ type: 'columns/delete'; payload: { id: string; }; }, ColumnsCtx>);
  register('columns/resequence', resequence as ActionImpl<{ type: 'columns/resequence'; payload: { boardId: string; columnId: string; newPosition: number; }; }, ColumnsCtx>);
  register('columns/updateTitle', updateTitle as ActionImpl<{ type: 'columns/updateTitle'; payload: { id: string; title: string; }; }, ColumnsCtx>);
}

/** Convenience factory to build a standalone Columns store */
export const makeColumnsStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) =>
  ((set: StoreApi<ColumnsStore>['setState'], get: StoreApi<ColumnsStore>['getState'], api: StoreApi<ColumnsStore> & SliceActionsApi<ColumnsCtx>) => {
    const withMw = withColumnsActions(deps)(createColumnsSlice as any);
    return withMw(set, get, api);
  }) as (set: StoreApi<ColumnsStore>['setState'], get: StoreApi<ColumnsStore>['getState'], api: StoreApi<ColumnsStore> & SliceActionsApi<ColumnsCtx>) => ColumnsStore;
