/* eslint-env node */

module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    indent: ['error', 2, {
      SwitchCase: 1,
    }],
    quotes: ['error', 'single', {
      allowTemplateLiterals: true,
    }],
    'brace-style': ['error', 'stroustrup', {
      allowSingleLine: false,
    }],
    curly: 'error',
    'comma-dangle': ['error', {
      functions: 'never',
      arrays: 'always-multiline',
      objects: 'always-multiline',
    }],
    'space-infix-ops': ['error'],
    'quote-props': ['error', 'as-needed'],
    'object-curly-spacing': ['error', 'never'],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    semi: ['error', 'never'],
    'eol-last': ['error', 'always'],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-empty': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-empty-function': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unreachable': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-multiple-empty-lines': ['error', {
      max: 1, maxEOF: 0,
    }],
  },
}
