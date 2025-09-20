import type { StateCreator, StoreApi } from 'zustand';
import { create } from 'zustand';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import type { Action } from '@tc/foundation/actions';
import { devtools } from 'zustand/middleware';

// Slices from features
import { createBoardsSlice } from '@tc/boards/application';
import { ColumnsSlice, createColumnsSlice } from '@tc/columns/application';
import { CardsSlice, createCardsSlice } from '@tc/cards/application';
import { Session } from '@supabase/supabase-js';

// Action registration from features
import { registerBoardsActions } from '@tc/boards/application';
import { registerColumnsActions } from '@tc/columns/application';
import { registerCardsActions } from '@tc/cards/application';

// Repos from features
import { BoardsRepoIDB } from '@tc/boards/data';
import { ColumnsRepoIDB } from '@tc/columns/data';
import { cardsRepoIDB, CardsRepoIDB } from '@tc/cards/data';
import { BoardsSlice } from '@tc/boards/domain';
import { boardsRepoIDB } from '@tc/boards/data';
import { columnsRepoIDB } from '@tc/columns/data';

// 1. The Combined State Shape
export type KanbanState = BoardsSlice & ColumnsSlice & CardsSlice & { moveCard: (cardId: string, targetColumnId: string, overCardId?: string, place?: 'before' | 'after') => void; repos: {
    boards: BoardsRepoIDB;
    columns: ColumnsRepoIDB;
    cards: CardsRepoIDB;
  }; hydrated: boolean; setHydrated: (hydrated: boolean) => void; activeBoardId: string | null; setActiveBoardId: (id: string) => void; session: Session | null; setSession: (session: Session | null) => void; };

// 2. The Combined Context for Actions
export type KanbanCtx = {
  api: StoreApi<KanbanStore>;
  repos: {
    boards: BoardsRepoIDB;
    columns: ColumnsRepoIDB;
    cards: CardsRepoIDB;
  };
  publish: (action: Action) => void;
  tabId: string;
};

// 3. The Final Store Type
export type KanbanStore = KanbanState & SliceActionsApi<KanbanCtx>;

// 4. The Combined Slice Creator
const createKanbanSlice: StateCreator<KanbanState, [], []> = (set, get, api) => {
  const repos = {
      boards: boardsRepoIDB,
      columns: columnsRepoIDB,
      cards: cardsRepoIDB,
  };

  return {
  repos,
  session: null,
  setSession: (session: Session | null) => set({ session }),
  activeBoardId: null,
  setActiveBoardId: (id: string) => set({ activeBoardId: id }),
  hydrated: false,
  setHydrated: (hydrated: boolean) => set({ hydrated }),
  ...createBoardsSlice(set, get, api),
  ...createColumnsSlice(set, get, api),
  ...createCardsSlice(set, get, api),
  moveCard: (cardId: string, targetColumnId: string, overCardId?: string, place: 'before' | 'after' = 'after') => {
    const { cards, upsertCard } = get();
    const cardToMove = cards[cardId];
    if (!cardToMove) return;

    const cardsInTargetColumn = Object.values(cards)
      .filter(c => c.column_id === targetColumnId && c.id !== cardId)
      .sort((a, b) => a.position - b.position);
    const STEP = 100;
    const endPos = () => (cardsInTargetColumn[cardsInTargetColumn.length - 1]?.position || 0) + STEP;

    let newPosition: number;

    if (overCardId) {
      const overIndex = cardsInTargetColumn.findIndex(c => c.id === overCardId);
      if (overIndex === -1) {
        newPosition = endPos();
      } else {
        const overCard = cardsInTargetColumn[overIndex];
        if (place === 'before') {
          const prev = cardsInTargetColumn[overIndex - 1];
          newPosition = prev ? (prev.position + overCard.position) / 2 : (overCard.position - STEP / 2);
        } else {
          const next = cardsInTargetColumn[overIndex + 1];
          newPosition = next ? (overCard.position + next.position) / 2 : (overCard.position + STEP / 2);
        }
      }
    } else {
      newPosition = endPos();
    }

    // Apply the move
    upsertCard({
      ...cardToMove,
      column_id: targetColumnId,
      position: newPosition,
    });

    // Optional normalization if gaps are too tight
    const withMoved = [
      ...cardsInTargetColumn,
      { ...cardToMove, column_id: targetColumnId, position: newPosition },
    ].sort((a, b) => a.position - b.position);

    let needRebalance = false;
    for (let i = 1; i < withMoved.length; i++) {
      if (Math.abs(withMoved[i].position - withMoved[i - 1].position) < 1) {
        needRebalance = true;
        break;
      }
    }

    if (needRebalance) {
      let pos = STEP;
      for (const c of withMoved) {
        upsertCard({ ...c, position: pos });
        pos += STEP;
      }
    }
  }
  }
};

// 5. The Middleware Factory
const withKanbanActions = (deps: { publish: (action: Action) => void; tabId: string; }) =>
  withActionsSlice<KanbanStore, KanbanCtx>({
    makeCtx: (api) => ({
      api,
      repos: api.getState().repos,
      publish: deps.publish,
      tabId: deps.tabId,
    }),
  });

// 6. The Final Store Factory
export const makeKanbanStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) => {
  const store = create<KanbanStore>()(
    devtools(
      withKanbanActions(deps)(createKanbanSlice as any),
      {
        name: 'KanbanStore',
        enabled: deps.dev,
      },
    ),
  );

  // Register all actions from all features
  registerBoardsActions(store as any);
  registerColumnsActions(store as any);
  registerCardsActions(store as any);

  return store;
};
