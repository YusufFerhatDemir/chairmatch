#!/bin/bash
# ============================================================
# Commit + Push alle Phase-1-Änderungen zu GitHub
# → Vercel deployed automatisch zu chairmatch.de in ~2 Min
# ============================================================

set -e
cd "$(dirname "$0")"

echo "🧹 Räume Lock-Files weg…"
rm -f .git/index.lock
rm -f .git/objects/*/tmp_obj_* 2>/dev/null || true

echo ""
echo "📋 Was wird committed:"
git status --short

echo ""
echo "🔍 Letzte Sicherheits-Frage: Sind .env-Files NICHT in der Liste?"
if git status --short | grep -E "\.env" | grep -v ".env.example"; then
  echo "❌ STOPP! .env-Datei würde committed — Secrets-Leak-Risiko!"
  echo "   Bitte erst in .gitignore eintragen, dann diesen Script neu starten."
  exit 1
else
  echo "✅ Keine .env-Files im Stage — sicher."
fi

echo ""
echo "📦 Stage alle Änderungen…"
git add -A

echo ""
echo "💾 Commit…"
git commit -m "Phase 1 Launch-Vorbereitung komplett

- Security: Permissions-Policy + Cross-Origin-Policies in next.config.ts
- MIS-Portal: Booking-Funnel, Provider-Health-Score, Onboarding-Pipeline,
  Error-Log-Stream, Auto-Refresh (60s)
- Native Apps: Capacitor 6 mit iOS- und Android-Projekten,
  alle Icons + Splash-Screens, Bundle-ID de.chairmatch.app
- Architektur: Live-WebView (laedt chairmatch.de) fuer instant Updates
- Setup-Scripts: NATIVE_APP_SETUP.sh + FIX_CAPACITOR_OVERWRITES.sh
- Dokumentation: DISASTER_RECOVERY.md + SECURITY_AUDIT.md (OWASP 10/12 gruen)"

echo ""
echo "🚀 Push zu GitHub (origin/main)…"
git push origin main

echo ""
echo "============================================================"
echo "✅ FERTIG. Vercel deployed jetzt automatisch."
echo "============================================================"
echo ""
echo "Live-Status verfolgen:"
echo "   https://vercel.com/yusufferhatdemirs-projects/chairmatch/deployments"
echo ""
echo "In ~2 Min sichtbar auf:"
echo "   https://chairmatch.de"
echo ""
echo "MIS-Portal (Admin-only):"
echo "   https://chairmatch.de/admin/mis"
