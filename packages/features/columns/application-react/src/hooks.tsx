import React, { useContext, useEffect, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { makeColumnsStore, registerColumnsActions, type ColumnsStore } from '@tc/columns/application';
import { ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { createFeatureStore } from '@tc/infra/store';
import { Column } from '@tc/columns/domain';

type ColumnsContext = {
  store: import('zustand').StoreApi<ColumnsStore>;
  dispatch: (action: { type: string; payload: any; meta?: any }) => Promise<void>;
  isLeader: boolean;
};

export const ColumnsCtx = React.createContext<ColumnsContext | null>(null);

export const ColumnsProvider = ({ children }: { children: React.ReactNode }) => {
  const feature = useMemo(() => {
    return createFeatureStore({
      makeStore: makeColumnsStore,
      registerActions: registerColumnsActions,
      localRepo: ColumnsRepoIDB,
      cloudRepo: ColumnsRepoSupabase,
      hydrateFnName: 'hydrateColumns',
      topic: 'columns',
    });
  }, []);

  useEffect(() => {
    return () => feature.cleanup();
  }, [feature]);

  return <ColumnsCtx.Provider value={{ store: feature.store, dispatch: feature.store.getState().dispatch, isLeader: feature.isLeader() }}>
    {children}
  </ColumnsCtx.Provider>;
};

export function useColumns(
  selector: (s: ColumnsStore) => Column[],
  equalityFn: (a: Column, b: Column) => boolean = Object.is,
) {
  const store = React.useContext(ColumnsCtx)?.store;
  if (!store) throw new Error('useColumns must be used inside <ColumnsProvider>');
  return selector(store.getState());
}

export function useColumnsDispatch() {
  const ctx = useContext(ColumnsCtx);
  if (!ctx) throw new Error('useColumnsDispatch must be used inside <ColumnsProvider>');
  return ctx.dispatch;
}
