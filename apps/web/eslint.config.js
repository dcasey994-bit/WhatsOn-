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
      globals: { ...globals.browser, __BUILD_TIME__: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Flags every "set loading, fetch, set result" effect, which is how
      // every page here loads its data. The alternative it points to is a
      // data-fetching library; until there is one, the rule is only noise
      // that hides the warnings that matter.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  // A context file exports its provider and the hooks that read it together.
  // That costs fast refresh in development for these files only, and keeps
  // each context in one place.
  {
    files: ['src/data/*Context.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  // Netlify functions run on Node, not in the browser, so `process` and
  // `Buffer` are real there. Without this every function reports them as
  // undefined and the genuine errors are lost in the noise.
  {
    files: ['netlify/functions/**/*.js'],
    languageOptions: { globals: globals.node },
  },
])
