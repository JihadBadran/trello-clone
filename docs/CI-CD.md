# CI/CD Pipeline

We use **Nx affected commands** and a modern CI pipeline to keep builds fast, incremental, and reliable.

---

## Goals

- ✅ Run only what changed (via `nx affected`).
- ✅ Ensure quality gates (lint, test, typecheck) on every PR.
- ✅ Build Storybook previews for UI review.
- ✅ Cache results to avoid recomputation across runs.

---

## Pipeline Stages

### 1. Install

```bash
pnpm install --frozen-lockfile
```

We use pnpm workspaces for consistent dependency management.

### 2. Lint & Typecheck

```bash
nx affected -t lint
nx affected -t typecheck
```

Ensures all changed projects pass ESLint and TypeScript.

### 3. Unit Tests

```bash
nx affected -t test --parallel=3 --ci --code-coverage
```

Runs affected tests in parallel with coverage reporting.

### 4. Build

```bash
nx affected -t build --parallel=3
```

Builds only the projects impacted by the PR.  
Most libs are non-buildable (apps handle bundling), so this step is fast.

### 5. Storybook (Visual Review)

```bash
nx affected -t storybook
```

Builds Storybook for changed libs (e.g., `uikit`, `presentation`).  
Can be uploaded to Chromatic or Netlify for per-PR visual review.

### 6. Deploy (optional)

For main branch merges:
- Deploy web app (`apps/web`) to staging/production.
- Upload Storybook to permanent docs site.

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
      - run: pnpm install --frozen-lockfile
      - run: npx nx affected -t lint typecheck test build --parallel=3 --ci
      - run: npx nx affected -t storybook --parallel=2
```

---

## Why this scales

- **Nx graph + hashing**: only run what’s affected by the commit.
- **Parallelism**: split jobs across cores.
- **Caching**: Nx Cloud or local cache makes repeated runs nearly free.
- **Storybook previews**: reviewers see UI changes immediately.

---
