# Architecture

This repo demonstrates a **scalable frontend architecture** built with [Nx](https://nx.dev/), React, and TypeScript.
Our guiding principles:

- **Nx + pnpm monorepo** with thin apps, fat libs. Apps wire routing and global providers; all logic lives in libraries.
- **Domain-driven feature slices**: `boards`, `columns`, `cards` with a composing `kanban` feature.
- **State via Zustand (vanilla)** with a middleware (`withActionsSlice`) that standardizes action registration and persistence.
- **Data via Supabase (Postgres + Realtime)** and **IndexedDB** for an offline outbox.
- **Sync model**: leader-tab drains the outbox → pushes to cloud; all tabs receive via BroadcastChannel + Supabase Realtime.
- **Guardrails**: no cloud calls in local reducers; followers do not persist on replay; handlers idempotent (LWW timestamps).

---

## Structure

```
apps/
  web/                          # Vite React app (routing, providers)

packages/
  foundation/                   # Core shared primitives
    actions/                    # Action + ActionImpl types
    types/                      # Shared scalars/types
    utils/                      # LWW compare, helpers

  infra/                        # Cross-cutting infrastructure
    idb/                        # IdbOutbox, IdbCursor, helpers
    supabase/                   # Supabase client + typed RPC/types
    sync-cloud/                 # MultiSyncController (leader only)
    sync-tabs/                  # Broadcast + leader election

  features/
    boards/
      application/              # Zustand slice + middleware
      application-react/        # Provider + hooks for React
      data/                     # Repos (idb/cloud), realtime
      domain/                   # Entities/VOs
      presentation/             # UI widgets/routes

    columns/…                   # Same layout as boards
    cards/…                     # Same layout as boards

    kanban/
      application/
      application-react/
      presentation/             # Composes boards + columns + cards
```

---

## Dependency Rules

We enforce boundaries via Nx tags (see `nx.json`):

- `scope:foundation` → no deps
- `scope:domain` → may depend on `foundation`
- `scope:application` → may depend on `domain`, `foundation`
- `scope:application-react` → may depend on `application`, `foundation`
- `scope:infra` → may depend on `application`, `foundation`
- `scope:uikit` → may depend on `foundation`
- `scope:presentation` → may depend on `application-react`, `uikit`, `foundation`, `presentation`
- `scope:app` → may depend on `presentation`, `uikit`

---

## Naming Conventions

- **Action type prefixes**: `boards/*`, `columns/*`, `cards/*`
- **Outbox topics**: `"boards" | "columns" | "cards"`
- **Key file names**: `repo.idb.ts`, `repo.cloud.ts`, `realtime.ts`, `withActionsSlice.ts`, `actions.ts`, `store.ts`, `provider.tsx`, `hooks.tsx`

---

## Pattern (per feature)

1) **Slice + Middleware**
   - Zustand slice defines state + mutations
   - Middleware `withActionsSlice` adds:
     - `register(type, impl)`
     - `dispatch(action, { localOnly? })`
       - Runs `toLocal` (mutate state, broadcast)
       - Runs `toPersist` (write IDB + enqueue outbox)

2) **Provider**
   - Build store with middleware
   - Register feature actions
   - Hydrate from IDB
   - Subscribe to Supabase Realtime
   - BroadcastChannel for cross-tab sync
   - Leader election → run `MultiSyncController`

3) **Data Contracts**
   - **IDB repo**: `getAll`, `put`, `enqueue`
   - **Cloud repo**: `push`, `pullSince`
   - **LocalRepo.applyFromCloud**: LWW then write to IDB

4) **Sync**
   - `MultiSyncController` manages push + pull for all topics
   - Outbox & cursor are IDB-based

---

## Why this scales

- New features = **folders**, not new packages.
- Boundaries are enforced via Nx tags and the directory layout.
- Clear separation of concerns: domain, app state, infra, and UI are decoupled.
- Offline-first outbox + leader-only sync scales to multiple tabs reliably.
- CI/CD runs only what changed with `nx affected` and caching.

