# State Management

We follow a **hybrid, offline-first strategy**:

- **Zustand (vanilla)** in each feature's `application/` package for local state and mutations.
- **React adapters** live in `application-react/` to expose providers and hooks.
- **IndexedDB outbox** for write-ahead persistence and offline capability.
- **Cross-tab sync** via BroadcastChannel; **cloud sync** via Supabase Realtime + leader-only controller.

---

## Why Zustand Vanilla?

- **Framework-agnostic**: stores work in workers, tests, or Node (no React dependency).
- **Composable**: each feature slice (`boards`, `columns`, `cards`) owns its state and actions.
- **Thin React layer**: easy to reuse stores outside the app or migrate UI frameworks.

---

## Slice + Actions Middleware

Each feature store is created with a middleware `withActionsSlice` that adds:

- `register(type, impl)` – register an action implementation.
- `dispatch(action, { localOnly? })` – execute an action pipeline.

Action implementation shape:

- `toLocal(ctx, action)` – pure local mutation. Must not call the network.
- `toPersist(ctx, action)` – persist mutation: write to IDB and enqueue into the outbox.

This ensures a consistent path for broadcasting, persistence, and replay across tabs.

---

## Sync and Offline

- **IndexedDB repos** persist local state (`repo.idb.ts`).
- **Outbox** records mutations for background syncing.
- **BroadcastChannel** delivers actions to sibling tabs; followers replay with `localOnly: true` and do not persist.
- **Supabase Realtime** provides cross-device updates.
- **MultiSyncController** (leader tab only) drains the outbox and performs cloud `push/pullSince` with LWW.

---

## Guardrails

- **No cloud calls** in `toLocal` or in feature providers.
- **Leader-only persistence** when replaying remote/tab-broadcasted actions (followers pass `localOnly: true`).
- **Idempotent handlers** using LWW timestamps.

---

## End-to-end flow

1. **UI** invokes a helper hook (e.g., `useCreateBoard()`).
2. Hook calls `dispatch({ type: 'boards/create', payload })`.
3. `toLocal` mutates the store and broadcasts the action to other tabs.
4. `toPersist` writes to IDB and enqueues the outbox.
5. Leader tab’s `MultiSyncController` pushes the outbox to Supabase and pulls updates.
6. Realtime + BroadcastChannel deliver updates; followers replay with `localOnly: true`.

