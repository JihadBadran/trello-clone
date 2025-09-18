import type { DBSchema } from 'idb';
import type { OutboxItem } from '@tc/foundation/types';
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
    value: OutboxItem;
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
    indexes: { by_board_id: string; by_updatedAt: string };
  };
  cards: {
    key: string;
    value: Card;
    indexes: { by_board_id: string; by_column_id: string; by_updatedAt: string };
  };
}
