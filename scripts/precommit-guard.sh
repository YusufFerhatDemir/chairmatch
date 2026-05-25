#!/usr/bin/env bash
# precommit-guard.sh — blockt verbotene Dateien und Secret-Leaks im Staging-Diff.
# Wird VOR git commit in deploy.sh aufgerufen.
#
# Prüft:
#   1. .env(.local|.production|.*) und node_modules/ in der Staging-Liste
#   2. Bekannte Secret-Patterns im Staging-Diff:
#        - Resend API Key:        re_<alnum>{20+}
#        - Stripe Live Secret:    sk_live_
#        - Stripe Live Publish:   pk_live_
#        - AWS Access Key:        AKIA[A-Z0-9]{16}
#        - JWT-like:              eyJ<...>.eyJ<...>

set -e

# --- 1. Verbotene Dateien ---
STAGED=$(git diff --cached --name-only)

if [ -z "$STAGED" ]; then
  echo "✓ Pre-commit-Guard: nichts gestaged (skip)"
  exit 0
fi

ENV_MATCHES=$(echo "$STAGED" | grep -E '(^|/)\.env($|\.)' || true)
# Whitelist: .env.example / .template / .sample sind Vorlagen ohne Secrets,
# explizit committable.
FORBIDDEN_ENV=$(echo "$ENV_MATCHES" | grep -v -E '\.(example|template|sample)$' || true)
FORBIDDEN_NM=$(echo "$STAGED" | grep -E '(^|/)node_modules/' || true)
FORBIDDEN=$(printf '%s\n%s\n' "$FORBIDDEN_ENV" "$FORBIDDEN_NM" | grep -v '^$' || true)
if [ -n "$FORBIDDEN" ]; then
  echo "❌ Versuche .env-Files oder node_modules zu committen:"
  echo "$FORBIDDEN" | sed 's/^/   - /'
  echo ""
  echo "Hinweis: Secrets gehören in Vercel-Env-Vars, nicht ins Repo."
  echo "Falls absichtlich (z.B. .env.example), Pattern in precommit-guard.sh anpassen."
  exit 1
fi

# --- 2. Secret-Pattern im Diff ---
# -U0: kein Context, nur die geänderten Zeilen.
# '^[+][^+]' = Zeile beginnt mit genau einem + (added line), nicht mit +++ (file header).
# So vermeiden wir BRE/ERE-Quirks rund um `\+\+\+` (ugrep/BSD grep brechen damit).
DIFF=$(git diff --cached -U0)
SECRETS=$(printf '%s\n' "$DIFF" \
  | grep -E '^[+][^+]' \
  | grep -E '(re_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{10,}|pk_live_[a-zA-Z0-9]{10,}|AKIA[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,})' \
  || true)

if [ -n "$SECRETS" ]; then
  echo "❌ Möglicher Secret-Leak im Diff:"
  echo "$SECRETS" | head -5 | sed 's/^/   /'
  echo ""
  echo "Bitte Secret in Vercel-Env-Var verschieben und Wert hier durch Placeholder ersetzen."
  echo "Falls False-Positive: Pattern in precommit-guard.sh prüfen."
  exit 1
fi

echo "✓ Pre-commit-Guard OK ($(echo "$STAGED" | wc -l | tr -d ' ') Dateien gestaged)"
