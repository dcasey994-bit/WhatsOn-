import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `android` holds the generated native project, including a copy of the
  // built web assets that cap sync writes into it — never our source.
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Netlify functions run on Node, not in the browser, so `process` and
  // `Buffer` are real there. Without this every function reports them as
  // undefined and the genuine errors are lost in the noise.
  {
    files: ['netlify/functions/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
