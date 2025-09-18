import type { StateCreator } from 'zustand';
import { compareLww as compareLwwCamelCase } from '@tc/foundation/utils';
import { Board, BoardsSlice } from '@tc/boards/domain';

/**
 * Compares two boards using LWW (Last Writer Wins) algorithm.
 * @param a First board to compare.
 * @param b Second board to compare.
 * @returns -1 if a is older, 1 if b is older, 0 if they are equal.
 */
const compareLww = (a: Board, b: Board) =>
  compareLwwCamelCase(
    { ...a, updatedAt: a?.updated_at },
    { ...b, updatedAt: b?.updated_at },
  );

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
      for (const r of rows) {
        const cur = s.boards[r.id];
        if (!cur || compareLww(cur, r) < 0) {
          next[r.id] = r;
        }
      }
      return { boards: next };
    }),
  upsertBoard: (row) =>
    set((s) => {
      const cur = s.boards[row.id];
      if (!cur || compareLww(cur, row) < 0) {
        return { boards: { ...s.boards, [row.id]: row } };
      }
      return s;
    }),
});
