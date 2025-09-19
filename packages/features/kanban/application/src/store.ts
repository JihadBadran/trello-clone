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
export type KanbanState = BoardsSlice & ColumnsSlice & CardsSlice & { repos: {
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
