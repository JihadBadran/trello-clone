import type { StateCreator, StoreApi } from 'zustand';
import { create } from 'zustand';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import type { Action } from '@tc/foundation/actions';
import { devtools } from 'zustand/middleware';

// Slices from features
import { createBoardsSlice } from '@tc/boards/application';
import { ColumnsSlice, createColumnsSlice } from '@tc/columns/application';
import { CardsSlice, createCardsSlice } from '@tc/cards/application';

// Action registration from features
import { registerBoardsActions } from '@tc/boards/application';
import { registerColumnsActions } from '@tc/columns/application';
import { registerCardsActions } from '@tc/cards/application';

// Repos from features
import { BoardsRepoIDB } from '@tc/boards/data';
import { ColumnsRepoIDB } from '@tc/columns/data';
import { CardsRepoIDB } from '@tc/cards/data';
import { BoardsSlice } from '@tc/boards/domain';

// 1. The Combined State Shape
export type KanbanState = BoardsSlice & ColumnsSlice & CardsSlice;

// 2. The Combined Context for Actions
export type KanbanCtx = {
  api: StoreApi<KanbanStore>;
  repos: {
    boards: typeof BoardsRepoIDB;
    columns: typeof ColumnsRepoIDB;
    cards: typeof CardsRepoIDB;
  };
  publish: (action: Action) => void;
  tabId: string;
};

// 3. The Final Store Type
export type KanbanStore = KanbanState & SliceActionsApi<KanbanCtx>;

// 4. The Combined Slice Creator
const createKanbanSlice: StateCreator<KanbanStore, [], []> = (set, get, api) => ({
  ...createBoardsSlice(set, get, api) as any,
  ...createColumnsSlice(set, get, api) as any,
  ...createCardsSlice(set, get, api) as any,
});

// 5. The Middleware Factory
const withKanbanActions = (deps: { publish: (action: Action) => void; tabId: string; }) =>
  withActionsSlice<KanbanStore, KanbanCtx>({
    makeCtx: (api) => ({
      api,
      repos: { boards: BoardsRepoIDB, columns: ColumnsRepoIDB, cards: CardsRepoIDB },
      publish: deps.publish,
      tabId: deps.tabId,
    }),
  });

// 6. The Final Store Factory
export const makeKanbanStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) => {
  const store = create<KanbanStore>()(
    devtools(
      withKanbanActions(deps)(createKanbanSlice),
      {
        name: 'KanbanStore',
        enabled: deps.dev,
      },
    ),
  );

  // Register all actions from all features
  registerBoardsActions(store);
  registerColumnsActions(store);
  registerCardsActions(store);

  return store;
};
