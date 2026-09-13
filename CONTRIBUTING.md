# Contributing to Trello Clone

Thanks for your interest in contributing!

## Prerequisites

- Node >= 20
- pnpm 9 (`npm i -g pnpm`)

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/trello-clone.git
cd trello-clone
pnpm install
```

Configure environment variables:

```bash
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your Supabase credentials
```

Start the dev server:

```bash
pnpm nx serve web
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run lint and typecheck before committing:

```bash
pnpm nx affected -t lint
pnpm nx affected -t typecheck
```

4. Open a PR against `main`

## Project Structure

This is an Nx monorepo organized by domain features:

- `apps/web/` – Vite React app (routing, providers)
- `packages/features/` – Domain features (`boards`, `columns`, `cards`, `kanban`)
- `packages/infra/` – Infrastructure (IndexedDB, Supabase, sync)
- `packages/foundation/` – Shared types, actions, utilities

Each feature is split into layers:
- `domain/` – Entities and value objects
- `application/` – Zustand store and actions
- `application-react/` – React hooks and providers
- `data/` – Repository implementations (IDB, Supabase)
- `presentation/` – UI components

## Commit Convention

Use clear, descriptive commit messages. Examples:

- `feat: add drag-and-drop card reordering`
- `fix: resolve column deletion not syncing`
- `refactor: simplify Zustand store middleware`

## Code Style

- TypeScript strict mode
- Functional components only
- Zustand for state management
- Tailwind CSS for styling
