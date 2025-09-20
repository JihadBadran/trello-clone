# Theming and UI Kit

Our design system lives in the `packages/uikit/` package and is consumed by apps via a Tailwind v4 preset.

- Based on composable primitives and shadcn-style components.
- Powered by **Tailwind v4** via the `@tailwindcss/vite` plugin.
- Exported as a **preset** from `packages/uikit/tailwind-preset.ts`.

---

## Tailwind v4 Setup

We use Tailwind v4 and enable it in Vite:

- `apps/web/vite.config.ts` – includes `(await import('@tailwindcss/vite')).default()`.
- `apps/web/src/styles.css` – includes `@import 'tailwindcss'` and defines theme tokens.
- `apps/web/tailwind.config.ts` – consumes the UI kit preset and sets content globs.

Tokens are defined in CSS and mapped with `@theme inline`:

```css
@import 'tailwindcss';

:root {
  --background: ...;
  --foreground: ...;
  /* other tokens */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* mappings to Tailwind design tokens */
}
```

---

## UIKit Organization

```
packages/uikit/
  src/components/ui/   # Reusable components
  src/lib/utils.ts     # cn() helper (clsx + tailwind-merge)
  tailwind-preset.ts   # Central tokens and plugin setup
```

- Components can import `cn` from `@tc/uikit/lib`.
- Apps import UI primitives from `@tc/uikit/components/ui/*`.

The app consumes the preset in `apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
import preset from '@tc/uikit/tailwind-preset';

export default {
  presets: [preset],
  content: [
    './index.html',
    'apps/web/src/**/*.{ts,tsx}',
    'packages/uikit/src/**/*.{ts,tsx}',
    'packages/presentation/src/**/*.{ts,tsx}',
  ],
} satisfies Config
```

---

## Storybook Integration (optional)

Libraries can set up Storybook to preview components in isolation.

- Use Vite + `@tailwindcss/vite` in Storybook's config.
- Provide a CSS entry that imports Tailwind and sources your components.

This ensures utilities are generated when rendering components outside the app.

---

## Why this is future-ready

- Centralized tokens via Tailwind preset.
- Components are composable and easily themed.
- Tailwind v4 reduces config overhead and integrates smoothly with Vite.
- Storybook previews scale with features, enabling visual regression tests.
