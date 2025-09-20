import type { StateCreator, StoreApi } from 'zustand';
import { nanoid } from 'nanoid';
import type { Action, ActionImpl } from '@tc/foundation/actions';
import { handlePersistence } from './dispatch.helpers';
type Publish = (action: Action) => void;

export type SliceActionsApi<Ctx> = {
  register: <A extends Action>(type: A['type'], impl: ActionImpl<A, Ctx>) => void;
  listActions: () => string[];
  dispatch: (action: Action, opts?: { localOnly?: boolean }) => Promise<void>;
};

export function withActionsSlice<S extends object, Ctx extends object>(deps: {
  /** Build per-dispatch handler context (repos, helpers, publish, tabId, …) */
  makeCtx: (api: StoreApi<S>) => Ctx & { publish: Publish; tabId: string };
  dev?: boolean;
}) {
  return (createSlice: StateCreator<S, [], [], S>): StateCreator<S & SliceActionsApi<Ctx>> => {
    return (set, get, api) => {
      const actions = new Map<string, ActionImpl<any, Ctx>>();
      const register: SliceActionsApi<Ctx>['register'] = (type, impl) => {
        if (deps.dev) console.log(`[Action] Registering ${type}`);
        actions.set(type, impl);
      };

      const listActions: SliceActionsApi<Ctx>['listActions'] = () => {
        return Array.from(actions.keys());
      };

      const dispatch: SliceActionsApi<Ctx>['dispatch'] = async (action, opts) => {
        console.log(`[${action.type}] Dispatching action: `, action, opts);
        const handler = actions.get(action.type);
        if (!handler) throw new Error(`Action ${action.type} not registered`);

        const ctx = deps.makeCtx(api as StoreApi<S>);
        const { publish, tabId } = ctx;

        console.log(`[${action.type}] handler: `, handler);

        // 1. Run local mutation
        if (handler.toLocal) {
          const { toLocal } = handler;
          await toLocal(ctx, action);
        }

        // 2. If localOnly, we're done (e.g. replaying from another tab)
        if (opts?.localOnly) return;

        // 3. Broadcast to other tabs
        publish({ ...action, from: tabId });

        // 4. Delegate to the persistence and sync handler
        const meta = { ...action.meta, actionId: nanoid() };
        const actionWithMeta = { ...action, meta };
        await handlePersistence(handler, ctx, actionWithMeta);
      };

      return {
        ...createSlice(set, get, api),
        register,
        listActions,
        dispatch,
      };
    };
  };
}
