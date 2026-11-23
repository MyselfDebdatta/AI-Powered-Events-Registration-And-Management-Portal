import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// jsx-a11y runs as warnings while Stages 2–4 rebuild the legacy pages;
// promote the whole group to 'error' once every page uses the new
// primitives (FrontendPlanning.md §9.1).
const a11yAsWarnings = Object.fromEntries(
  Object.entries(jsxA11y.configs.recommended.rules).map(([rule, level]) => [
    rule,
    level === 'error' || level === 'warn' ? 'warn' : level,
  ])
)

export default [
  { ignores: ['dist', 'node_modules', 'design/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...a11yAsWarnings,
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
]
