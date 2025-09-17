# Theming and UI Kit

Our design system lives in the **uikit** package:

- Based on **[shadcn/ui](https://ui.shadcn.com/)** components.
- Powered by **Tailwind v4** (`@tailwindcss/vite` plugin).
- Exported as a **preset** (`tailwind-preset.ts`) for apps to consume.

---

## Tailwind v4

Tailwind v4 is **CSS-first**:

- No `tailwind.config.js` required in libraries.
- Each environment (app, Storybook) has its own CSS entry with:

```css
@import "tailwindcss";
@source "../../packages/uikit/src/**/*.{ts,tsx}";
```

- **`@theme`** directive defines tokens:

```css
@theme {
  --color-brand: #4f46e5;
  --radius-xl: 1rem;
}
```

---

## UIKit Organization

```
packages/uikit/
  src/components/ui/   # Generated shadcn components
  src/lib/utils.ts     # cn() helper (clsx + tailwind-merge)
  tailwind-preset.ts   # Central tokens and plugin setup
```

- Components import `cn` from `@tc/uikit/lib`.
- Apps import from `@tc/uikit/components/ui/*` or the components barrel.

---

## Storybook Integration

Each library can run Storybook in isolation:

- **Vite + @tailwindcss/vite** plugin in `.storybook/main.ts`.
- Dedicated CSS entry (`storybook.tailwind.css`) with `@import "tailwindcss";` and `@source "../src/**/*.{ts,tsx}"`.

This ensures utilities are generated when rendering components outside the app.

---

## Why this is future-ready

- Centralized tokens via Tailwind preset.
- Shadcn components are composable and easily themed.
- Tailwind v4 reduces config overhead and integrates smoothly with Vite.
- Storybook previews scale with features, enabling visual regression tests.
