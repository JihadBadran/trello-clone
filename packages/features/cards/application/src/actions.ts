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

  const moveCard: ActionImpl<{ type: 'cards/move'; payload: { cardId: string, targetColumnId: string, position: number, withRepositioning?: boolean } }, CardsCtx> = {
    toLocal: ({ api }, { payload }) => {
      console.log('toLocal Moving card', { cardId: payload.cardId, targetColumnId: payload.targetColumnId, position: payload.position, withRepositioning: payload.withRepositioning });

      api.getState().moveCard(payload.cardId, payload.targetColumnId, payload.position, payload.withRepositioning);
    },
    toPersist: async ({ api, repos }, { payload }) => {
      const state = api.getState();
      const card = state.cards?.[payload.cardId];
      if (!card) return;
      if (!payload.withRepositioning) {
        const updatedCard = { ...card, column_id: payload.targetColumnId, position: payload.position, updated_at: new Date().toISOString() as ISODateTime };
        await repos.cards.putLocal(updatedCard);
        await repos.cards.enqueueUpsert(updatedCard);
      } else {
        // loop over all cards in the target column and update their position
        const cardsInTargetColumn = Object.values(state.cards).filter((c) => c.column_id === payload.targetColumnId);
        const updatedCards = cardsInTargetColumn.map((c, index) => ({ ...c, position: index * 100 }));
        for (const c of updatedCards) {
          await repos.cards.putLocal(c);
          await repos.cards.enqueueUpsert(c);
        }
      }
    },
    toCloud: async ({ api }, { payload }) => {
      const state = api.getState();
      const card = state.cards?.[payload.cardId];
      if (!card) return;
      if (!payload.withRepositioning) {
        await CardsRepoSupabase.upsert({ ...card, updated_at: new Date().toISOString() as ISODateTime });
      } else {
        const cardsInTargetColumn = Object.values(state.cards).filter((c) => c.column_id === payload.targetColumnId);
        const updatedCards = cardsInTargetColumn.map((c, index) => ({ ...c, position: index * 100 }));
        for (const c of updatedCards) {
          await CardsRepoSupabase.upsert(c);
        }
      }
    },
  };

  register('cards/upsert', upsertCard);
  register('cards/delete', deleteCard);
  register('cards/move', moveCard);
}

/** Convenience factory to build a standalone Cards store */
export const makeCardsStore = (deps: { publish: CardsCtx['publish']; tabId: string; dev?: boolean }) =>
  ((set: StoreApi<CardsStore>['setState'], get: StoreApi<CardsStore>['getState'], api: StoreApi<CardsStore> & SliceActionsApi<CardsCtx>) => {
    const withMw = withCardsActions(deps)(createCardsSlice as any);
    return withMw(set, get, api);
  });
