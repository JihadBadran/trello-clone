import type { BoardsRepo } from './ports';
import type { Board } from '@tc/domain-boards';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);

export function createBoard(repo: BoardsRepo) {
  return async (title: string, ownerId: string): Promise<Board> => {
    const b: Board = {
      id: (nanoid() as unknown) as Board['id'],
      title: title.trim(),
      ownerId: ownerId as any,
      isArchived: false,
      updatedAt: new Date().toISOString() as any
    };
    await repo.upsert(b);
    return b;
  };
}