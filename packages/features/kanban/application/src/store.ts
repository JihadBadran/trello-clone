import type { StoreApi } from 'zustand';
import { createStore } from 'zustand';
import { withActionsSlice, type SliceActionsApi } from '@tc/infra/store';
import type { Action } from '@tc/foundation/actions';

// Slices from features
import { createBoardsSlice, type BoardsSlice } from '@tc/boards/application';
import { createColumnsSlice, type ColumnsSlice } from '@tc/columns/application';
import { createCardsSlice, type CardsSlice } from '@tc/cards/application';

// Action registration from features
import { registerBoardsActions } from '@tc/boards/application';
import { registerColumnsActions } from '@tc/columns/application';
import { registerCardsActions } from '@tc/cards/application';

// Repos from features
import { BoardsRepoIDB } from '@tc/boards/data';
import { ColumnsRepoIDB } from '@tc/columns/data';
import { CardsRepoIDB } from '@tc/cards/data';

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
const createKanbanSlice = (
  set: StoreApi<KanbanStore>['setState'],
  get: StoreApi<KanbanStore>['getState'],
  api: StoreApi<KanbanStore>,
) => ({
  ...createBoardsSlice(set, get, api),
  ...createColumnsSlice(set, get, api),
  ...createCardsSlice(set, get, api),
});

// 5. The Middleware Factory
const withKanbanActions = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) =>
  withActionsSlice<KanbanStore, KanbanCtx>({
    dev: deps.dev,
    makeCtx: (api) => ({
      api,
      repos: { boards: BoardsRepoIDB, columns: ColumnsRepoIDB, cards: CardsRepoIDB },
      publish: deps.publish,
      tabId: deps.tabId,
    }),
  });

// 6. The Final Store Factory
export const makeKanbanStore = (deps: { publish: (action: Action) => void; tabId: string; dev?: boolean }) => {
  const store = createStore<KanbanStore>((set, get, api) => {
    const stateCreator = withKanbanActions(deps)(createKanbanSlice as any);
    return stateCreator(set, get, api);
  });

  // Register all actions from all features
  registerBoardsActions(store);
  registerColumnsActions(store);
  registerCardsActions(store);

  return store;
};
