/** @type {import('tailwindcss').Config} */

// Génère un shade Tailwind utilisant les CSS vars RGB pour le support d'opacité
const shade = (name, n) => `rgb(var(--${name}-${n}-rgb) / <alpha-value>)`;
const palette = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(n => [n, shade(name, n)])
  );

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:   palette('primary'),
        secondary: palette('secondary'),
        // Semantic tokens injectés par ThemeContext (dark/light)
        bg:       'var(--bg)',
        surface:  'var(--surface)',
        surface2: 'var(--surface-2)',
        'app-border': 'var(--border-color)',
        'app-text':   'var(--text-default)',
        'app-muted':  'var(--text-muted)',
      },
    },
  },
  plugins: [],
}
