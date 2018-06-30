module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: 'eslint:recommended',
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  rules: {
    'prettier/prettier': 'error',
    indent: ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'no-console': 'warn',
    'no-extra-semi': 'warn',
    quotes: ['error', 'single'],
    semi: ['error', 'never']
  }
}
