import type { StateCreator } from 'zustand';
import { Board } from '@tc/boards/domain';

export type BoardsSlice = {
  boards: Record<string, Board>;

  hydrateBoards: (rows: Board[]) => void;
  upsertBoard: (row: Board) => void;
};

export const createBoardsSlice: StateCreator<
  BoardsSlice,
  [],
  [],
  BoardsSlice
> = (set) => ({
  boards: {},

  hydrateBoards: (rows) =>
    set((s) => {
      const next = { ...s.boards };
      for (const r of rows) next[r.id] = r;
      return { boards: next };
    }),

  upsertBoard: (row) => {
    console.log("[boards] upsertBoard: ", row);
    set((s) => ({ boards: { [row.id]: row, ...s.boards } }))

  }
});
