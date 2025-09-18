import { Board } from "./entities/board";

export type BoardsSlice = {
  boards: Record<string, Board>;

  hydrateBoards: (rows: Board[]) => void;
  upsertBoard: (row: Board) => void;
};