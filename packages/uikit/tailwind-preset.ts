import type { Config } from 'tailwindcss'

const preset: Partial<Config> = {
  theme: {
    extend: {
      // Add your tokens here (colors, radius, spacing, etc.)
      // colors: { brand: { DEFAULT: '#4f46e5' } },
      // borderRadius: { xl: '1rem' },
    },
  },
  plugins: [
    // e.g., require('@tailwindcss/forms'), require('@tailwindcss/typography')
  ],
}

export default preset