import { Board } from '../entities/board.js';

export type BoardCreated = {
  type: 'BoardCreated';
  v: 1;
  at: string;
  board: Board;
};

export type BoardArchived = {
  type: 'BoardArchived';
  v: 1;
  at: string;
  boardId: string;
  ownerId: string;
};