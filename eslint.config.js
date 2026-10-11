import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  // Build output and generated code.
  globalIgnores(['dist', 'playwright-report', 'test-results', 'src/routeTree.gen.ts', 'src/shared/api/schema.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // The vite preset's options, plus TanStack Router's createLink, which
      // wraps a component the way memo does (shared/components/PageHeader).
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, extraHOCs: ['createLink'] }],
    },
  },
  {
    // shadcn/ui components export their variant helpers (buttonVariants)
    // next to the component, and other shadcn components import them.
    files: ['src/shared/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
