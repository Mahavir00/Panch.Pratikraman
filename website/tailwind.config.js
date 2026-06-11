/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens (driven by CSS variables in src/index.css)
        ground: 'rgb(var(--c-ground) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        // Jain devotional palette
        maroon: 'rgb(var(--c-maroon) / <alpha-value>)',
        saffron: 'rgb(var(--c-saffron) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        jgreen: 'rgb(var(--c-green) / <alpha-value>)',
        indigo: 'rgb(var(--c-indigo) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['"EB Garamond"', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        guj: ['"Noto Serif Gujarati"', '"Noto Sans Gujarati"', 'serif'],
        'guj-sans': ['"Noto Sans Gujarati"', 'sans-serif'],
        deva: ['"Noto Serif Devanagari"', '"Noto Sans Devanagari"', 'serif'],
        'deva-sans': ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      maxWidth: {
        reading: '46rem',
        page: '78rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -12px rgb(0 0 0 / 0.18)',
        'card-lg': '0 2px 6px rgb(0 0 0 / 0.06), 0 18px 48px -18px rgb(0 0 0 / 0.28)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease both',
      },
    },
  },
  plugins: [],
}
