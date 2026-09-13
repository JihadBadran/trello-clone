# Trello Clone

An offline-first Kanban board built with React 19, Zustand, Tailwind CSS v4, and Supabase.

![CI](https://github.com/JihadBadran/trello-clone/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

<!-- Add a screenshot or GIF here -->
<!-- ![Demo](./docs/screenshot.png) -->

## Features

- **Offline-first** — Create and edit boards, columns, and cards without an internet connection
- **Real-time sync** — Changes sync across browser tabs and to Supabase in real-time
- **Drag & drop** — Reorder cards and columns with @dnd-kit
- **PWA** — Installable as a Progressive Web App with service worker caching
- **Multi-tab** — Automatic leader election for cloud sync; all tabs share local state
- **Type-safe** — Full TypeScript coverage with strict mode

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| State | Zustand (vanilla) |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Postgres + Realtime) |
| Local DB | IndexedDB (via idb) |
| Monorepo | Nx + pnpm |
| Build | Vite 7 |
| Routing | Tanstack Router |
| Drag & Drop | @dnd-kit |

## Getting Started

### Prerequisites

- Node >= 20
- pnpm 9 (`npm i -g pnpm`)

### Install

```bash
git clone https://github.com/JihadBadran/trello-clone.git
cd trello-clone
pnpm install
```

### Configure

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"
```

### Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy your project URL and anon key
3. Paste them into `apps/web/.env`
4. Run the database migrations:

```bash
# Install Supabase CLI (if not already installed)
pnpm dlx supabase login

# Link to your project
pnpm dlx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to create all tables and policies
pnpm dlx supabase db push
```

This creates:
- `boards`, `columns`, `cards` tables with UUID primary keys
- `board_members` table for collaboration
- `profiles` table linked to Supabase Auth
- Row Level Security (RLS) policies for multi-tenant access
- Realtime replication for live updates
- Auto-updating `updated_at` triggers
- Auto-ownership triggers for new boards

### Run

```bash
pnpm nx serve web
# → http://localhost:4200
```

## Project Structure

```
apps/
  web/                           # Vite React app (routing, providers)

packages/
  foundation/
    actions/                     # Action + ActionImpl types
    types/                       # Shared scalars
    utils/                       # LWW compare, helpers

  infra/
    idb/                         # IndexedDB outbox
    supabase/                    # Client + typed RPC
    sync-cloud/                  # MultiSyncController (leader only)
    store/                       # Zustand base store

  features/
    boards/                      # Board CRUD
    columns/                     # Column CRUD
    cards/                       # Card CRUD + drag-and-drop
    kanban/                      # Composes all features

    # Each feature has:
    domain/                      # Entities and value objects
    data/                        # Repositories (IDB + Supabase)
    application/                 # Zustand store and actions
    application-react/           # React hooks and providers
    presentation/                # UI components
```

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture overview.

**Key decisions:**

- **Domain-driven feature slices** — Each feature (`boards`, `columns`, `cards`) is self-contained with its own domain, data, and presentation layers
- **Zustand vanilla store** — Framework-agnostic state with React bindings
- **Offline outbox pattern** — Local writes go to IndexedDB first; leader tab drains to Supabase
- **tab-bridge** — Cross-tab state sync and leader election via BroadcastChannel

## Common Tasks

```bash
# Build
pnpm nx build web

# Test
pnpm nx test web

# Lint
pnpm nx affected -t lint

# Typecheck
pnpm nx affected -t typecheck

# Explore project graph
pnpm nx graph

# Regenerate Supabase types (after schema changes)
pnpm run cloud:types:gen
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
