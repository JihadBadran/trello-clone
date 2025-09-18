import { MultiSyncController } from './controller';
import { IdbOutbox, getCursor, setCursor } from '@tc/infra/idb';
import type { ChannelConfig, CursorApi, ISODateTime } from './types';

// A compliant IdbCursor that handles multiple topics as required by CursorApi.
class MultiTopicIdbCursor implements CursorApi {
  get(topic: string): Promise<string | null> {
    return getCursor(topic);
  }
  set(topic: string, value: ISODateTime): Promise<void> {
    return setCursor(topic, value);
  }
}

export type SyncConfig = {
  channels: Record<string, ChannelConfig>;
  pollInterval?: number;
};

/**
 * Creates and starts a MultiSyncController based on the provided configuration.
 * This is the generic engine for syncing multiple data types between local IDB and cloud repos.
 *
 * @param config - The configuration object specifying channels and poll interval.
 * @returns A function to stop the sync controller.
 */
export function createAndStartSync(config: SyncConfig): () => void {
  const controller = new MultiSyncController({
    channels: config.channels,
    outbox: new IdbOutbox(),
    cursor: new MultiTopicIdbCursor(),
    schedule: (fn: () => void, ms: number) => {
      const id = setTimeout(fn, ms);
      return { cancel: () => clearTimeout(id) };
    },
    now: () => Date.now(),
    baseIntervalMs: config.pollInterval ?? 5000,
  });

  controller.start(0);

  return () => controller.stop();
}
