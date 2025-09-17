# Architecture

This repo demonstrates a **scalable frontend architecture** built with [Nx](https://nx.dev/), React, and TypeScript.
Our guiding principles:

- **Thin apps, fat libs**: applications contain almost no logic; all business logic, state, and UI live in libraries.
- **Few packages, many features**: we avoid one-lib-per-feature. Instead, each layer has one package with **feature folders** inside.
- **Domain-Driven Design (DDD)**: we separate foundation, domain, application, data, UI kit, and presentation layers.
- **Non-buildable by default**: only packages we intend to publish are buildable/composite; the rest are workspace-internal.

---

## Structure

```
apps/
  web/               # Vite React app (routing, global providers)

packages/
  foundation/        # Core types and utilities
    types/           # IDs, time, Result/Either, branded types
    utils/           # LWW, retry/backoff, etc.

  domain/            # Pure domain model (entities, VOs, events, services)
    boards/
    cards/
    users/

  application/       # Feature use-cases and ports (vanilla state)
    features/
      boards/
      cards/
      auth/

  application-react/ # React adapters (hooks/providers for stores)

  data/              # Data adapters (infra)
    auth/            # Supabase auth port impl
    cloud/           # Supabase repos
    idb/             # IndexedDB repos and outbox
    sync/            # Sync controller and broadcast bus

  uikit/             # Shadcn components + Tailwind v4 preset
    src/components/ui/*
    tailwind-preset.ts

  presentation/      # React feature UIs (routes, widgets)
    boards/
    cards/
    shared/

  testing/           # Test utils, fakes, contract harness
```

---

## Dependency Rules

We enforce boundaries via Nx tags:

- **foundation** → no deps
- **domain** → foundation
- **application** → domain, foundation
- **application-react** → application, foundation
- **data** → application (to implement ports), domain, foundation
- **uikit** → foundation
- **presentation** → application-react, uikit, foundation

---

## Why this scales

- New features = **folders**, not new packages.
- Easy to enforce architectural boundaries with Nx.
- Minimal package count (≈ 10–12).
- Clear “evolution path”: promote `uikit` (or others) to publishable if needed.
- CI/CD with `nx affected` scales to large teams.
