# State Management

We follow a **hybrid strategy** aligned with current frontend best practices:

- **Zustand (vanilla)** for **local feature state** inside the application layer.
- **React adapters** in `application-react` to expose feature providers/hooks.
- **Server/cache** handled by query clients (e.g. TanStack Query) where offline/outbox is not required.
- **Outbox + sync** handled by `data/idb` and `data/sync`.

---

## Why Zustand Vanilla?

- **Framework-agnostic**: core state stores can be used outside React (workers, tests).
- **Simple and composable**: each feature owns its store (`boards`, `cards`, `auth`).
- **React adapter** is thin and easily replaced.

---

## Sync and Offline

- **IndexedDB repos** persist state locally.
- **Outbox** pattern: mutations are stored locally, then synced in the background.
- **BroadcastChannel bus** syncs actions across tabs.
- **Sync controller** merges local/cloud using LWW (last-write-wins).

---

## When to Use TanStack Query

For server state that doesn’t need offline/outbox:
- Use TanStack Query in React.
- Keep caching, retries, and stale-while-revalidate there.
- Still expose domain entities via ports for consistency.

---

## Example Flow

1. **Presentation** calls `useBoards()` hook.  
2. **application-react** delegates to vanilla Zustand store.  
3. Store interacts with **application.use-cases** (e.g., `CreateBoard`).  
4. Use-case calls a **port** (e.g., `BoardsRepo`).  
5. Repo is implemented in **data/idb** (local) and synced via **data/sync**.
