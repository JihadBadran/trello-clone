// The basic shape of any action that can be dispatched
export type Action<T = Record<string, unknown>> = {
  type: string;
  payload: T;
  meta?: Record<string, unknown>;
  from?: string; // The ID of the tab that originated the action
};

// The implementation of an action, defining its local and persistent effects
export type ActionImpl<A extends Action, Ctx> = {
  // Optimistic update to the local store
  toLocal?: (ctx: Ctx, action: A) => void | Promise<void>;
  // Persist changes to the local database (e.g., IndexedDB)
  toPersist?: (ctx: Ctx, action: A) => void | Promise<void>;
  // Eagerly push changes to the cloud, bypassing the outbox
  toCloud?: (ctx: Ctx, action: A) => void | Promise<void>;
};
