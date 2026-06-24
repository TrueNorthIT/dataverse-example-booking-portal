import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'src/types/generated.ts']),
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
      // Allow intentional throwaway bindings (e.g. destructuring to strip keys)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // shadcn/ui co-locates a `cva` variants const with the component
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    // Context/provider files intentionally export hooks alongside their provider,
    // and shadcn/ui primitives co-locate their `cva` variants with the component;
    // fast-refresh of these infra modules isn't a concern.
    files: [
      'src/contexts/**/*.{ts,tsx}',
      'src/components/auth/**/*.{ts,tsx}',
      'src/components/ui/**/*.{ts,tsx}',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Test files, mocks and helpers: Node globals, and fast-refresh / a few
    // recommended rules don't apply to test-only modules.
    files: ['tests/**/*.{ts,tsx}', '__mocks__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
