import React, { useContext, useEffect, useMemo } from 'react';
import { makeCardsStore, registerCardsActions, type CardsStore, type CardsCtx } from '@tc/cards/application';
import { cardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';
import { createFeatureStore } from '@tc/infra/store';
import type { Action } from '@tc/foundation/actions';
import type { Card } from '@tc/cards/domain';

type CardsContext = {
  store: import('zustand').StoreApi<CardsStore>;
  dispatch: (action: Action, options?: { localOnly?: boolean }) => Promise<void>;
  isLeader: boolean;
};

export const CardsContext = React.createContext<CardsContext | null>(null);

export const CardsProvider = ({ children }: { children: React.ReactNode }) => {
  const feature = useMemo(() => {
    return createFeatureStore<CardsStore, CardsCtx, Card, typeof cardsRepoIDB>({
      makeStore: makeCardsStore as any,
      registerActions: registerCardsActions,
      localRepo: cardsRepoIDB,
      cloudRepo: CardsRepoSupabase,
      hydrateFnName: 'hydrateCards',
      topic: 'cards',
    });
  }, []);

  useEffect(() => {
    return () => feature.cleanup();
  }, [feature]);

  return <CardsContext.Provider value={{ store: feature.store, dispatch: feature.store.getState().dispatch, isLeader: feature.isLeader() }}>
    {children}
  </CardsContext.Provider>;
};

export function useCards<T>(
  selector: (s: CardsStore) => T,
) {
  const store = React.useContext(CardsContext)?.store;
  if (!store) throw new Error('useCards must be used inside <CardsProvider>');
  return selector(store.getState());
}

export function useCardsDispatch() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error('useCardsDispatch must be used inside <CardsProvider>');
  return ctx.dispatch;
}
