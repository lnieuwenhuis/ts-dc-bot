import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blurple: { DEFAULT: '#5865F2', dark: '#4752C4' },
      },
    },
  },
  plugins: [],
} satisfies Config;
