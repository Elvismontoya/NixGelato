import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const noUnusedVars = ['error', {
  varsIgnorePattern: '^[A-Z_]',
  argsIgnorePattern: '^_',
}]

export default defineConfig([
  globalIgnores(['dist', '**/node_modules']),

  // ── Frontend (navegador + React) ──────────────────────────
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': noUnusedVars,
      // Este proyecto comparte helpers junto a componentes en algún .jsx;
      // no rompe HMR de forma relevante a esta escala.
      'react-refresh/only-export-components': 'warn',
    },
  },

  // ── Backend + config (Node) ───────────────────────────────
  {
    files: ['server/**/*.js', '*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': noUnusedVars,
    },
  },
])
