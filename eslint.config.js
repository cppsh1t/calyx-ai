import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import solid from 'eslint-plugin-solid'

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Ignore patterns
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/.opencode/**',
      '**/.agents/**',
    ],
  },

  // Base configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      solid: solid,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General JavaScript/TypeScript rules
      'no-console': 'off', // Allow console in CLI apps
      'no-debugger': 'warn',
      'no-alert': 'error',
      'no-const-assign': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',

      // SolidJS specific rules
      'solid/components-return-once': 'error',
      'solid/no-innerhtml': 'error',
      'solid/no-react-specific-props': 'error',
      'solid/jsx-no-duplicate-props': 'error',
      'solid/jsx-no-script-url': 'error',
      'solid/jsx-no-undef': 'error',
      'solid/no-destructure': 'warn',
      'solid/style-prop': 'error',

      // Best practices
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
      'no-throw-literal': 'error',
    },
  },

  // Prettier integration - MUST be last to override other configs
  prettier,
]
