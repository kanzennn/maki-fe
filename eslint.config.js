import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The architecture's rules (docs/architecture.md, "Layers"), as import
// restrictions: a broken one fails `npm run lint`, and so CI.

const ts = '{ts,tsx}'
const tests = ['src/**/*.test.{ts,tsx}', 'src/test/**']

/**
 * React, the router, server-state and form libraries, and UI kits:
 * presentation's, never the modules'. zustand/vanilla is a store without
 * React, which lib/session.ts keeps the token in.
 */
const reactAndUi = {
  regex: '^(react|react-dom|react-router|react-router-dom|react-hook-form|react-i18next|radix-ui|lucide-react|class-variance-authority|zustand(?!/vanilla))(/|$)|^@(tanstack/react-|radix-ui/|hookform/)',
  message: 'modules/ hold no React, router or UI code: that is presentation (app, components, hooks, providers).',
}
const presentationFolders = {
  regex: '^@/(app|components|hooks|providers)(/|$)',
  message: 'Dependencies point inwards: modules/ and lib/ never import the presentation layer.',
}
const repositories = {
  regex: '^@/modules/[^/]+/repositories(/|$)',
  message: 'Presentation calls a usecase, never a repository.',
}
const routes = {
  regex: '^@/app(/|$)',
  message: 'Nothing imports a route. A component two routes use moves to components/<feature>/.',
}
const parentRelative = {
  regex: '^\\.\\./',
  message: 'Imports across folders, layers or modules go through the @/ alias.',
}
const axiosImport = { name: 'axios', message: 'Only lib/http.ts calls axios: use its http helpers.' }

const noFetch = {
  'no-restricted-globals': ['error', { name: 'fetch', message: 'HTTP goes through lib/http.ts (axios).' }],
  'no-restricted-properties': [
    'error',
    ...['globalThis', 'window', 'self'].map((object) => ({
      object,
      property: 'fetch',
      message: 'HTTP goes through lib/http.ts (axios).',
    })),
  ],
}

const restrict = ({ paths = [], patterns = [] }) => ({ 'no-restricted-imports': ['error', { paths, patterns }] })

/** Per module: its own files import each other by relative path, and nothing outside the module that way. */
const moduleRules = readdirSync(fileURLToPath(new URL('./src/modules', import.meta.url)), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap(({ name }) => {
    const ownByAlias = {
      regex: `^@/modules/${name}(/|$)`,
      message: `Within modules/${name}, import its own files by relative path.`,
    }
    // Out of the module into src/, that is: two more steps up leave the app,
    // where maki-be's test vectors are, and those stay relative.
    const leaving = (depth) => ({
      regex: `^${'\\.\\./'.repeat(depth)}(?!(\\.\\./){2})`,
      message: 'Leave the module through the @/ alias, never a relative path.',
    })
    const base = [reactAndUi, presentationFolders, ownByAlias]
    return [
      {
        files: [`src/modules/${name}/*.${ts}`],
        rules: { ...restrict({ paths: [axiosImport], patterns: [...base, leaving(1)] }), ...noFetch },
      },
      {
        files: [`src/modules/${name}/*/*.${ts}`],
        rules: { ...restrict({ paths: [axiosImport], patterns: [...base, leaving(2)] }), ...noFetch },
      },
    ]
  })

export default defineConfig([
  // Build output and generated code.
  globalIgnores(['dist', 'playwright-report', 'test-results', 'src/routeTree.gen.ts', 'src/lib/api-schema.d.ts']),
  {
    files: [`**/*.${ts}`],
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
      // wraps a component the way memo does (components/shared/page-header).
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, extraHOCs: ['createLink'] }],
    },
  },
  {
    // shadcn/ui components export their variant helpers (buttonVariants)
    // next to the component, and other shadcn components import them: the
    // generated ones, and those edited for DESIGN.md, now in components/shared.
    files: [
      'src/components/ui/**/*.tsx',
      'src/components/shared/{alert-dialog,badge,button,checkbox,dialog,native-select,table}.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Presentation: app (routes), components, hooks, providers.
  {
    // A route imports its own _components and the other layers, nothing of another route.
    files: [`src/app/**/*.${ts}`],
    ignores: ['src/app/**/_components/**', ...tests],
    rules: {
      ...restrict({
        paths: [axiosImport],
        patterns: [
          repositories,
          routes,
          parentRelative,
          {
            regex: '^\\./(?!_components/)',
            message: "A route imports only its own _components/ by relative path; anything else through the @/ alias.",
          },
        ],
      }),
      ...noFetch,
    },
  },
  {
    files: [`src/app/**/_components/**/*.${ts}`, `src/components/**/*.${ts}`, `src/hooks/**/*.${ts}`, `src/providers/**/*.${ts}`],
    ignores: tests,
    rules: { ...restrict({ paths: [axiosImport], patterns: [repositories, routes, parentRelative] }), ...noFetch },
  },

  // Application and domain: modules/<feature>/.
  ...moduleRules,

  // Infrastructure: lib/. Only http.ts may import axios.
  {
    files: [`src/lib/**/*.${ts}`],
    ignores: ['src/lib/http.ts', ...tests],
    rules: { ...restrict({ paths: [axiosImport], patterns: [presentationFolders, reactAndUi, parentRelative] }), ...noFetch },
  },
  {
    files: ['src/lib/http.ts'],
    rules: { ...restrict({ patterns: [presentationFolders, reactAndUi, parentRelative] }), ...noFetch },
  },
])
