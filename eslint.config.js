import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', 'coverage/**', '*.js'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts', '**/*.test.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Code quality rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Style rules
      semi: ['error', 'always'],
      quotes: ['error', 'single'],

      // Algorithm-specific rules (more lenient for mathematical code)
      complexity: ['warn', 15], // Allow higher complexity for graph algorithms
    },
  },
];
