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
      const cardWithTimestamp = { ...payload, updated_at: new Date().toISOString() as ISODateTime };
      await repos.cards.putLocal(cardWithTimestamp);
      await repos.cards.enqueueUpsert(cardWithTimestamp);
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
      await repos.cards.enqueueRemove(payload.id);
    },
    toCloud: async ({}, { payload }) => {
      await CardsRepoSupabase.remove(payload.id);
    },
  };

  const moveCard: ActionImpl<{ type: 'cards/move'; payload: { cardId: string, targetColumnId: string, position: number } }, CardsCtx> = {
    toLocal: ({ api }, { payload }) => {
      console.log('toLocal Moving card', payload.cardId, 'to column', payload.targetColumnId, 'at position', payload.position, api.getState().moveCard);

      api.getState().moveCard(payload.cardId, payload.targetColumnId, payload.position);
    },
    toPersist: async ({ api, repos }, { payload }) => {
      const state = api.getState();
      const card = state.cards?.[payload.cardId];
      if (!card) return;
      const updatedCard = { ...card, column_id: payload.targetColumnId, position: payload.position, updated_at: new Date().toISOString() as ISODateTime };
      await repos.cards.putLocal(updatedCard);
      await repos.cards.enqueueUpsert(updatedCard);
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
