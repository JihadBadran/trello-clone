import type { OutboxApi } from '@tc/foundation/types';
import { readOutbox, clearOutbox } from './outbox';

export class IdbOutbox implements OutboxApi {
  readNextBatch(topic: string, limit?: number) {
    console.log('[sync] readNextBatch', { topic, limit })
    return readOutbox(topic, limit);
  }

  ack(ids: string[]) {
    console.log('[sync] ack', { ids })
    return clearOutbox(ids);
  }
}
