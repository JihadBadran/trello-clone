import type { Config } from 'tailwindcss';
import preset from '@tc/uikit/tailwind-preset';

export default {
  presets: [preset],
  content: [
    './index.html',
    'apps/web/src/**/*.{ts,tsx}',
    'packages/uikit/src/**/*.{ts,tsx}',     // scan uikit components
    'packages/presentation/src/**/*.{ts,tsx}',     // scan presentation components
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config