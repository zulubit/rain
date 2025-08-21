export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        CustomEvent: 'readonly',
        customElements: 'readonly',
        HTMLElement: 'readonly',
        Node: 'readonly',
        Element: 'readonly',
        MutationObserver: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': ['warn', { 'allow': ['warn', 'error', 'group', 'groupEnd', 'log'] }],
      'semi': ['error', 'never'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'indent': ['error', 2],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'comma-dangle': ['error', 'never'],
      'no-multiple-empty-lines': ['error', { 'max': 1 }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'no-multi-spaces': 'error'
    }
  }
]