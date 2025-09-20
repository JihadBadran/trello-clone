# Trello Clone (Nx + React)

An offline-first Kanban app built with Nx, React 19, Zustand, Tailwind v4, and Supabase. The monorepo is organized by domain features: `boards`, `columns`, `cards`, and a composing `kanban` feature.

See `docs/` for architecture and implementation details:

- `docs/ARCHITECTURE.md`
- `docs/STATE.md`
- `docs/THEMING.md`
- `docs/CI-CD.md`

## Prerequisites

- Node >= 20 (see `package.json#engines`)
- pnpm 9 (`npm i -g pnpm`)

Optional:

- Nx Console extension (VSCode/IntelliJ) for a great DX
- Supabase CLI (only needed if you regenerate types or run local Supabase)

## Quick Start

1) Install dependencies

```bash
pnpm install
```

2) Configure environment variables for the web app

Create or edit `apps/web/.env`:

```bash
VITE_SUPABASE_URL="https://<your-project>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-key>"
```

The repo includes demo values that point to a public project. You can keep them for local development, or switch to your own Supabase project.

3) Start the dev server

```bash
pnpm nx serve web
# opens http://localhost:4200
```

4) Explore the project graph

```bash
pnpm nx graph
```

## Common Tasks

- Build the app

```bash
pnpm nx build web
```

- Run tests

```bash
pnpm nx test web
```

- Lint all projects

```bash
pnpm nx affected -t lint
```

## Supabase Types (optional)

If you use your own Supabase project, regenerate the typed API:

```bash
# Update the project-id first in package.json (scripts.cloud:types:gen)
pnpm run cloud:types:gen
```

This writes `packages/infra/supabase/src/types.gen.ts` using the Supabase CLI. You may need to login first:

```bash
pnpm dlx supabase login
```

## Monorepo Layout (high level)

- `apps/web/` – Vite React app (routing, providers)
- `packages/foundation/` – shared types, actions, utils
- `packages/infra/` – IndexedDB, Supabase client/types, sync controller, cross-tab sync
- `packages/features/` – domain features (`boards`, `columns`, `cards`, `kanban`) split into `application`, `application-react`, `data`, `domain`, `presentation`

More details in `docs/ARCHITECTURE.md`.

## Notes

- The app uses Tailwind v4 with the `@tailwindcss/vite` plugin. Tokens are defined in `apps/web/src/styles.css` and the UI Kit preset is consumed in `apps/web/tailwind.config.ts`.
- The PWA service worker is enabled in dev (`vite-plugin-pwa`). If you see aggressive caching, perform a hard refresh or toggle "Update on reload" in DevTools > Application > Service Workers.

## License

MIT
