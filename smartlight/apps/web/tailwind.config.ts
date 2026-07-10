import type { Config } from 'tailwindcss';
import { smartlightPreset } from '@smartlight/config';

export default {
  presets: [smartlightPreset as Config],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
