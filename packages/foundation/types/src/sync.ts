/** A generic record for the outbox. */
export type OutboxItem<T = unknown> = {
  id: string;
  topic: string;
  op: 'upsert' | 'remove';
  payload: T;
  at: number;
};
