import type { OutboxApi } from '@tc/foundation/types';
import { readOutbox, clearOutbox } from './outbox';

export class IdbOutbox implements OutboxApi {
  readNextBatch(topic: string, limit?: number) {
    return readOutbox(topic, limit);
  }

  ack(ids: string[]) {
    return clearOutbox(ids);
  }
}
