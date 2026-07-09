import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import unusedImports from 'eslint-plugin-unused-imports'
import nextPlugin from '@next/eslint-plugin-next'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

// Flat-Config (ESLint 10). Bewusst schlank gehalten: Fokus auf die real
// nützlichen Signale (ungenutzte Imports/Variablen), ohne den Build zu
// blocken. `next.config.ts` hält `eslint.ignoreDuringBuilds` — Lint ist ein
// Dev-/CI-Signal, kein Deploy-Gate. Type-aware Regeln sind absichtlich AUS
// (kein Projekt-Parser-Overhead, schneller Lauf).
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'mobile/**',
      'index_legacy.html',
      'supabase/**',
      '**/*.config.{js,mjs,ts}',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Vorhandene `eslint-disable`-Direktiven im Code referenzieren teils Regeln
    // aus der früheren eslint-config-next (no-console, no-explicit-any …), die
    // diese schlanke Config bewusst nicht aktiviert. Ohne diese Option würde
    // `--fix` sie als "unbenutzt" entfernen und Whitespace-Reste hinterlassen.
    // 'off' = Direktiven unangetastet lassen.
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'unused-imports': unusedImports,
      '@next/next': nextPlugin,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      // Next.js/React-Regeln registrieren — im Code stehen bereits gezielte
      // `eslint-disable`-Direktiven (z.B. dangerouslySetInnerHTML für JSON-LD-
      // Schema, bewusste <img>-Nutzung). Ohne registrierte Plugins wären diese
      // Direktiven "unbekannte Regel"-Fehler. Als warn = Signal, kein Blocker.
      '@next/next/no-img-element': 'warn',
      'react/no-danger': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Ungenutzte Imports automatisch entfernbar (--fix)
      'unused-imports/no-unused-imports': 'warn',
      // Ungenutzte Variablen; führende Unterstriche als "bewusst ungenutzt"
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Wir nutzen das unused-imports-Plugin für unused-vars; die
      // Core-Regeln aus recommended abschalten, um Doppel-Meldungen zu vermeiden.
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      // Pragmatische Toleranz für diese Codebasis (viele bewusste `as never`
      // Supabase-Casts, dynamische DB-Rows). Kein Deploy-Blocker.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Leere catch-Blöcke sind hier idiomatisch (best-effort Logging/Insert,
      // Tabelle darf fehlen). Als warn + allowEmptyCatch statt error.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Defensive Initialisierer (`let x = 0` / `let body = {}` vor try/catch)
      // sind bewusst — lesbarer als bedingte Zuweisung, kein Bug. Nur warn.
      'no-useless-assignment': 'warn',
    },
  },
)
