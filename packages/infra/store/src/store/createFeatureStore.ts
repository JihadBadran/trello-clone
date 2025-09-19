import { Action } from '@tc/foundation/actions';
import { FeatureRepo } from '@tc/foundation/types';
import { IdbOutbox, getCursor, setCursor } from '@tc/infra/idb';
import {
  MultiSyncController,
  type ChannelConfig,
  type CloudRepo,
  type LocalRepo,
} from '@tc/infra/sync-cloud';
import { tabSync } from '@tc/infra/sync-tabs';
import { create, type StateCreator, type StoreApi } from 'zustand';
import { type SliceActionsApi } from './withActionsSlice';

// Define a repository that is guaranteed to have a `getAll` method for hydration.
export type HydratableRepo<T> = LocalRepo & { getAll: () => Promise<T[]> };

// Generic types for the feature's state and context
type FeatureSlice = Record<string, unknown>;
type FeatureCtx = Record<string, unknown>;

// The full store type for a feature
type FeatureStore<S extends FeatureSlice, C extends FeatureCtx> = S & SliceActionsApi<C>;

// The signature for the `makeStore` factory function
type MakeStore<S extends FeatureSlice, C extends FeatureCtx> = (
  deps: { publish: (action: Action) => void; tabId: string; dev?: boolean },
) => StateCreator<FeatureStore<S, C>, [], [], FeatureStore<S, C>>;

// The configuration for creating a feature store
type CreateFeatureStoreOptions<S extends FeatureSlice, C extends FeatureCtx, TEntity, R extends FeatureRepo<TEntity>> = {
  makeStore: MakeStore<S, C>;
  registerActions: (store: StoreApi<FeatureStore<S, C>>) => void;
  localRepo: R;
  cloudRepo: CloudRepo;
  hydrateFnName: keyof S;
  topic: string;
  onApply?: (store: StoreApi<FeatureStore<S, C>>) => (item: TEntity) => void;
};

export function createFeatureStore<S extends FeatureSlice, C extends FeatureCtx, TEntity, R extends FeatureRepo<TEntity>>({
  makeStore,
  registerActions,
  localRepo,
  cloudRepo,
  hydrateFnName,
  topic,
  onApply,
}: CreateFeatureStoreOptions<S, C, TEntity, R>) {

  const store = create<FeatureStore<S, C>>(
    makeStore({
      publish: (msg: Action) => tabSync.publish({ ...msg, from: tabSync.TAB_ID }),
      tabId: tabSync.TAB_ID,
      dev: true,
    }),
  );

  registerActions(store);

  if (onApply) {
    localRepo.onApply = onApply(store);
  }

  const unsubBus = tabSync.subscribe(async (action) => {
    // Ignore actions from this tab or actions not relevant to this feature's topic
    if (action.from === tabSync.TAB_ID || !action.type.startsWith(`${topic}/`)) return;

    console.log(`[${topic}] Received action: `, action, tabSync.TAB_ID);
    await store.getState().dispatch(action, { localOnly: true });
  });

  (async () => {
    const data = await localRepo.getAll();
    const hydrator = store.getState()[hydrateFnName];
    if (typeof hydrator === 'function') {
      if (data.ok && data.rows) {
        hydrator(data.rows);
      }
    }
  })();

  let stopSync: (() => void) | null = null;
  const unsubLeader = tabSync.onLeaderChange((isLeader) => {
    if (isLeader) {
      const channel: ChannelConfig = { topic, local: localRepo, cloud: cloudRepo };
      const controller = new MultiSyncController({
        channels: { [topic]: channel },
        outbox: new IdbOutbox(),
        // Provide a multi-topic cursor adapter compliant with CursorApi
        cursor: {
          get: (t: string) => getCursor(t),
          set: (t: string, v: string) => setCursor(t, v),
        },
        schedule: (fn, ms) => {
          const t = setTimeout(fn, ms);
          return { cancel: () => clearTimeout(t) };
        },
      });
      stopSync = () => controller.stop();
      controller.start();
    } else {
      stopSync?.();
      stopSync = null;
    }
  });

  const cleanup = () => {
    unsubBus();
    unsubLeader();
    // The singleton's cleanup will be handled at the app level, not here.
    stopSync?.();
  };

  return { store, isLeader: tabSync.isLeader, cleanup };
}
