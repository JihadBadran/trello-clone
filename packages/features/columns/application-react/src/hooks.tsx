import React, { useContext, useEffect, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector';
import { makeColumnsStore, registerColumnsActions, type ColumnsStore } from '@tc/columns/application';
import { ColumnsRepoIDB, ColumnsRepoSupabase } from '@tc/columns/data';
import { createFeatureStore } from '@tc/infra/store';

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

export function useColumns<T extends unknown>(
  selector: (s: ColumnsStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const store = React.useContext(ColumnsCtx)!.store;
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState, // server snapshot
    selector,
    equalityFn,
  );
}

export function useColumnsDispatch() {
  const ctx = useContext(ColumnsCtx);
  if (!ctx) throw new Error('useColumnsDispatch must be used inside <ColumnsProvider>');
  return ctx.dispatch;
}
