import type { Config } from 'tailwindcss';

/**
 * Star Line design tokens. Brand = the red/white identity of Star Line
 * Bangladesh, tuned for accessible contrast on white.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FDE3E4',
          200: '#FBC9CC',
          300: '#F7A0A6',
          400: '#F06B75',
          500: '#E63946',
          600: '#C4121F',
          700: '#A30F1B',
          800: '#871118',
          900: '#701217',
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#475569',
          faint: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-bengali)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
