#!/usr/bin/env bash
# Startet die Expo-App (mobile/) im Web-Modus für Screenshot-/Vorschau-Zwecke.
# Preview-MCP ruft das über .claude/launch.json auf.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../mobile"
exec npx expo start --web --port 8082
