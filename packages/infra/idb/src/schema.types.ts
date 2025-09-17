import type { DBSchema } from 'idb';
import type { OutboxRecord } from './outbox';
import type { Board } from '@tc/boards/domain';
import type { Column } from '@tc/columns/domain';
import type { Card } from '@tc/cards/domain';

export interface TrelloCloneDB extends DBSchema {
  meta: {
    key: string;
    value: unknown; // Cursors, etc.
  };
  outbox: {
    key: string;
    value: OutboxRecord;
    indexes: { topic: string };
  };
  boards: {
    key: string;
    value: Board;
    indexes: { by_updatedAt: string };
  };
  columns: {
    key: string;
    value: Column;
    indexes: { by_boardId: string; by_updatedAt: string };
  };
  cards: {
    key: string;
    value: Card;
    indexes: { by_boardId: string; by_columnId: string; by_updatedAt: string };
  };
}
