/**
 * Shared Tailwind preset for SmartLight frontends.
 *
 * Extends the default Tailwind palette with:
 *   - Brand "smart" colors (primary, neutral, accent)
 *   - Custom font stack
 *   - Container defaults
 *   - Common box-shadows
 *
 * Apps reference it from `tailwind.config.{ts,js}`:
 *
 *   import preset from '@smartlight/config/tailwind-preset';
 *   export default { presets: [preset], content: [...] };
 */
import type { Config } from 'tailwindcss';

export const brandColors = {
  smart: {
    50: '#f5f8ff',
    100: '#e6efff',
    200: '#c7dcff',
    300: '#a3c2ff',
    400: '#789dff',
    500: '#4a78f8',
    600: '#2d5be0',
    700: '#2347b3',
    800: '#1c3a8e',
    900: '#1a336f',
    950: '#101e44',
  },
  accent: {
    50: '#fff8e6',
    100: '#ffeebd',
    200: '#ffdc7a',
    300: '#ffc83d',
    400: '#ffb014',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
};

export const smartlightPreset: Partial<Config> = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: brandColors,
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        elevated: '0 8px 24px -8px rgb(0 0 0 / 0.12)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
};

export default smartlightPreset;