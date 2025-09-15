import { createStore } from 'zustand/vanilla';
import type { Board } from '@tc/domain-boards';
import type { BoardsRepo } from './ports';

type State = { boards: Board[]; loaded: boolean };
type Actions = {
  hydrate: () => Promise<void>;
  upsertLocal: (b: Board) => void;
  removeLocal: (id: string) => void;
};

export type BoardsStore = ReturnType<typeof createBoardsStore>;

export function createBoardsStore(deps: { local: BoardsRepo }) {
  return createStore<State & Actions>((set, get) => ({
    boards: [],
    loaded: false,
    hydrate: async () => {
      const list = await deps.local.getAll();
      set({ boards: list, loaded: true });
    },
    upsertLocal: (b) => {
      const arr = get().boards.slice();
      const i = arr.findIndex(x => x.id === b.id);
      if (i === -1) arr.push(b); else arr[i] = b;
      set({ boards: arr });
    },
    removeLocal: (id) => set({ boards: get().boards.filter(x => x.id !== id) }),
  }));
}