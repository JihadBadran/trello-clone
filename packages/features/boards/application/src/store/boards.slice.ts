import { BoardsSlice, Board } from '@tc/boards/domain';
import { StateCreator } from 'zustand';

export const createBoardsSlice: StateCreator<
  BoardsSlice,
  [],
  [],
  BoardsSlice
> = (set) => ({
  boards: {},
  hydrateBoards: (boards: Board[]) =>
    set({
      boards: Object.fromEntries(boards.map((b) => [b.id, b])),
    }),
  upsertBoard: (board: Board) =>
    set((state) => ({
      boards: { ...state.boards, [board.id]: board },
    })),
});
