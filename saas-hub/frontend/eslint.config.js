import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Codebase historique très typée `any` (API responses, event handlers) —
      // à durcir progressivement plutôt qu'en un seul passage.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Règles React Compiler (v7+) très strictes sur des patterns useEffect
      // standards (fetch au montage, composants imbriqués) — assouplies en
      // attendant une revue dédiée du data-fetching.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      // Fast Refresh (dev only, zéro impact prod) — plusieurs fichiers exportent
      // sciemment des constantes/hooks à côté d'un composant.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
