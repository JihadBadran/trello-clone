import React, { useContext, useEffect, useMemo } from 'react';
import { makeCardsStore, registerCardsActions, type CardsStore } from '@tc/cards/application';
import { CardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';
import { createFeatureStore } from '@tc/infra/store';

type CardsContext = {
  store: import('zustand').StoreApi<CardsStore>;
  dispatch: (action: { type: string; payload: any; meta?: any }) => Promise<void>;
  isLeader: boolean;
};

export const CardsCtx = React.createContext<CardsContext | null>(null);

export const CardsProvider = ({ children }: { children: React.ReactNode }) => {
  const feature = useMemo(() => {
    return createFeatureStore({
      makeStore: makeCardsStore,
      registerActions: registerCardsActions,
      localRepo: CardsRepoIDB,
      cloudRepo: CardsRepoSupabase,
      hydrateFnName: 'hydrateCards',
      topic: 'cards',
    });
  }, []);

  useEffect(() => {
    return () => feature.cleanup();
  }, [feature]);

  return <CardsCtx.Provider value={{ store: feature.store, dispatch: feature.store.getState().dispatch, isLeader: feature.isLeader() }}>
    {children}
  </CardsCtx.Provider>;
};

export function useCards<T>(
  selector: (s: CardsStore) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
) {
  const store = React.useContext(CardsCtx)?.store;
  if (!store) throw new Error('useCards must be used inside <CardsProvider>');
  return store;
}

export function useCardsDispatch() {
  const ctx = useContext(CardsCtx);
  if (!ctx) throw new Error('useCardsDispatch must be used inside <CardsProvider>');
  return ctx.dispatch;
}
