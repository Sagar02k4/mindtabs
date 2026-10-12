import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'WebAuthPortal/**', '.agents/**', '.codex/**', 'main/**', 'public/**', 'tailwind.config.js', 'postcss.config.js', '**/*.ts', '**/*.tsx'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'src/**/*.jsx', 'tests/**/*.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, chrome: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      'no-restricted-properties': ['error', { object: 'Element', property: 'innerHTML', message: 'Use React state/rendering instead of innerHTML.' }],
      'no-restricted-syntax': ['error', { selector: 'AssignmentExpression[left.property.name="innerHTML"]', message: 'Use React state/rendering instead of innerHTML.' }],
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
