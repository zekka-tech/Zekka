/**
 * ESLint flat config (eslint 9+).
 *
 * Replaces .eslintrc.json. eslint-config-airbnb-base was dropped — it is
 * unmaintained and only supports eslint 8; the rules this codebase relies on
 * are declared explicitly below.
 */

const js = require('@eslint/js');
const globals = require('globals');
const importPlugin = require('eslint-plugin-import');
const jestPlugin = require('eslint-plugin-jest');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  js.configs.recommended,
  importPlugin.flatConfigs.recommended,

  // Resolve .ts modules during the incremental TypeScript migration so JS
  // files can require migrated modules (and vice versa) without extension
  // errors.
  {
    settings: {
      'import/resolver': {
        node: { extensions: ['.js', '.ts', '.json'] },
      },
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      indent: ['error', 2],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'max-len': ['warn', {
        code: 120,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-param-reassign': ['error', { props: false }],
      'consistent-return': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'prefer-template': 'warn',
      'prefer-arrow-callback': 'warn',
      'arrow-body-style': ['warn', 'as-needed'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'LabeledStatement',
          message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
      ],
      radix: 'warn',
      camelcase: ['warn', {
        properties: 'never',
        ignoreDestructuring: true,
        allow: ['pull_request', 'owner_id'],
      }],
      'no-nested-ternary': 'warn',
      'default-case': 'warn',
      'no-promise-executor-return': 'warn',
      'no-shadow': 'warn',
      'no-use-before-define': ['warn', { functions: false }],
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: { array: false, object: true },
          AssignmentExpression: { array: false, object: false },
        },
      ],
      'no-useless-escape': 'error',
      'no-throw-literal': 'error',
      'no-case-declarations': 'error',
      'no-unsafe-optional-chaining': 'error',
      'default-param-last': 'error',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js', 'eslint.config.js'],
      }],
      'import/extensions': ['error', 'ignorePackages', { js: 'never', ts: 'never' }],
      'import/order': 'error',
      'import/no-dynamic-require': 'error',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    plugins: { jest: jestPlugin },
    rules: {
      ...jestPlugin.configs['flat/recommended'].rules,
      'jest/expect-expect': 'warn',
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
];
