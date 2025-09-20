# CI/CD Pipeline

We use **Nx affected commands** with pnpm to keep builds fast, incremental, and reliable.

---

## Goals

- ✅ Run only what changed (via `nx affected`).
- ✅ Ensure quality gates (lint, test, typecheck) on every PR.
- ✅ Cache results across runs (Nx local cache or Nx Cloud).
- ✅ Optionally deploy the web app on main merges.

---

## Pipeline Stages

### 1. Install

```bash
pnpm install --frozen-lockfile
```

We use pnpm workspaces for consistent dependency management.

### 2. Lint, Typecheck, Test

```bash
nx affected -t lint
nx affected -t typecheck
nx affected -t test --parallel=3 --ci
```

Ensures all changed projects pass ESLint, TypeScript, and unit tests.

### 3. Build

```bash
nx affected -t build --parallel=3
```

Builds only the projects impacted by the PR. Most libs are non-buildable (apps handle bundling), so this step is fast.

### 4. Deploy (optional)

For main branch merges:
- Deploy web app (`apps/web`) to your host (Netlify, Vercel, etc.).
- Upload static assets as needed. The app is a Vite SPA.

---

## Nx Cloud (optional but recommended)

We use `@nx/nx-cloud` as the default runner (see `nx.json`). To enable remote caching in CI, set the following secret in your provider:

- `NX_CLOUD_ACCESS_TOKEN` – your workspace access token

With caching enabled, repeated builds/tests become significantly faster.

---

## Example GitHub Actions Workflow

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Nx affected quality gates
        run: npx nx affected -t lint typecheck test --parallel=3 --ci
      - name: Nx affected build
        run: npx nx affected -t build --parallel=3
      # Example deploy step (replace with your provider)
      # - name: Deploy web
      #   if: github.ref == 'refs/heads/main'
      #   run: |
      #     npx nx build web
      #     # upload ./apps/web/dist to your hosting
```

---

## Environment variables

For preview builds that need to run the app, provide the Vite env vars (client-safe):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

These are public anonymous keys used by the client SDK, safe to expose to the browser. Keep service-role keys out of the client/build.

---

## Why this scales

- **Nx graph + hashing**: only run what’s affected by the commit.
- **Parallelism**: split jobs across cores.
- **Caching**: Nx Cloud or local cache makes repeated runs nearly free.
- **Modular features**: Only the app and changed feature libs rebuild.
