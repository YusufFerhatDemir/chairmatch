#!/usr/bin/env bash
# verify-push.sh — prüft ob der lokale HEAD wirklich auf origin angekommen ist.
# Wird am Ende von deploy.sh aufgerufen. Bei Failure: roter Fehler, kein "alles gut".

set -e

LOCAL_HEAD=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE_HEAD=$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')

if [ -z "$REMOTE_HEAD" ]; then
  echo "❌ Remote-Branch $BRANCH existiert nicht auf origin"
  exit 2
fi

if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  echo "❌ PUSH NICHT ANGEKOMMEN:"
  echo "   lokal:  $LOCAL_HEAD"
  echo "   remote: $REMOTE_HEAD"
  echo "   Branch: $BRANCH"
  exit 1
fi

echo "✓ Push verifiziert: $BRANCH @ $LOCAL_HEAD ist auf origin"
