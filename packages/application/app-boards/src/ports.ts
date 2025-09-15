import type { Board } from '@tc/domain-boards';

export interface BoardsRepo {
  getAll(): Promise<Board[]>;
  since(ts: Date): Promise<Board[]>;
  upsert(b: Board): Promise<void>;
  remove(id: string): Promise<void>;
}