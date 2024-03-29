/* eslint-disable no-undef */

// require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  ignorePatterns: [
    'dist/',
    // 其他忽略规则
  ],
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'vue/multi-word-component-names': ['error', { ignores: ['index', 'index.vue'] }],
    'no-console': 'off',
    'quote-props': ['error', 'as-needed'],
    quotes: ['error', 'single'],
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    indent: 'off',
    '@typescript-eslint/indent': ['error', 2]
  }
}
