import type { StoreApi } from 'zustand';
import type { ActionImpl } from '@tc/foundation/actions';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import { createCardsSlice, type CardsSlice } from './cards.slice';
import { Action } from '@tc/foundation/actions';
import { Card } from '@tc/cards/domain';
import { FeatureRepo, ISODateTime } from '@tc/foundation/types';
import { cardsRepoIDB, CardsRepoSupabase } from '@tc/cards/data';

/** Context handed to handlers */
export type CardsCtx = {
  api: StoreApi<CardsStore>;
  repos: { cards: FeatureRepo<Card> };
  publish: (action: Action) => void;
  tabId: string;
};

export type CardsStore = CardsSlice & SliceActionsApi<CardsCtx>;

/** Middleware factory for the Cards slice */
export const withCardsActions = (deps: {
  publish: CardsCtx['publish'];
  tabId: string;
  dev?: boolean;
}) =>
  withActionsSlice<CardsStore, CardsCtx>({
    makeCtx: (api) => ({
      api,
      repos: { cards: cardsRepoIDB },
      publish: deps.publish,
      tabId: deps.tabId,
    }),
    dev: deps.dev,
  });

/** Register default Cards actions */
export function registerCardsActions(store: StoreApi<CardsStore>) {
  const register = store.getState().register;

  const upsertCard: ActionImpl<{ type: 'cards/upsert'; payload: Card }, CardsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().upsertCard({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toPersist: async ({ repos }, { payload }) => {
      await repos.cards.putLocal({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
    toCloud: async ({ }, { payload }) => {
      await CardsRepoSupabase.upsert({ ...payload, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  const deleteCard: ActionImpl<{ type: 'cards/delete'; payload: { id: string } }, CardsCtx> = {
    toLocal: ({ api }, { payload }) => {
      api.getState().removeCard(payload.id);
    },
    toPersist: async ({ repos }, { payload }) => {
      await repos.cards.removeLocal(payload.id);
    },
    toCloud: async ({}, { payload }) => {
      await CardsRepoSupabase.remove(payload.id);
    },
  };

  const moveCard: ActionImpl<{ type: 'cards/move'; payload: { cardId: string, targetColumnId: string, overCardId?: string, place?: 'before' | 'after' } }, CardsCtx> = {
    toLocal: ({ api }, { payload }) => {
      (api.getState() as any).moveCard(payload.cardId, payload.targetColumnId, payload.overCardId, payload.place);
    },
    toPersist: async ({ api, repos }, { payload }) => {
      const state = api.getState() as any;
      const card = state.cards?.[payload.cardId];
      if (!card) return;
      await repos.cards.putLocal({ ...card, updated_at: new Date().toISOString() as ISODateTime });
    },
    toCloud: async ({ api }, { payload }) => {
      const state = api.getState() as any;
      const card = state.cards?.[payload.cardId];
      if (!card) return;
      await CardsRepoSupabase.upsert({ ...card, updated_at: new Date().toISOString() as ISODateTime });
    },
  };

  register('cards/upsert', upsertCard as any);
  register('cards/delete', deleteCard as any);
  register('cards/move', moveCard as any);
}

/** Convenience factory to build a standalone Cards store */
export const makeCardsStore = (deps: { publish: CardsCtx['publish']; tabId: string; dev?: boolean }) =>
  ((set: StoreApi<CardsStore>['setState'], get: StoreApi<CardsStore>['getState'], api: StoreApi<CardsStore> & SliceActionsApi<CardsCtx>) => {
    const withMw = withCardsActions(deps)(createCardsSlice as any);
    return withMw(set, get, api);
  }) as any;
