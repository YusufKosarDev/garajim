import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'coverage']),

  // Uygulama kaynağı (tarayıcı, ESM, JSX + TS)
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: { react },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // JSX içinde kullanılan küçük harfli import'ları (motion, Field vs.)
      // "kullanılmıyor" sanmasın diye — no-unused-vars tek başına JSX'i görmüyor.
      'react/jsx-uses-vars': 'error',

      // typescript-eslint kendi no-unused-vars'ını getiriyor; ikisi birden açık
      // kalırsa aynı sorun iki kez raporlanır. Temel kuralı kapatıp TS
      // sürümünü aynı ayarlarla kullanıyoruz.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // Cypress test dosyaları (ESM + mocha/chai + cy globals)
  {
    files: ['cypress/**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.mocha,
        ...globals.chai,
        cy: 'readonly',
        Cypress: 'readonly',
        expect: 'readonly',
        assert: 'readonly',
      },
    },
  },

  // Node tarafı: yapılandırma dosyaları ve build script'leri.
  // Hepsi ESM — package.json'da "type": "module" var, ayrı bir CommonJS
  // bloğuna gerek yok (cypress.config.js de artık ESM).
  {
    files: [
      '*.config.js',
      'eslint.config.js',
      'scripts/**/*.mjs',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
])
