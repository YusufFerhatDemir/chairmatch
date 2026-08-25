#!/usr/bin/env node
/**
 * Preis-Schema — Live-Verifikation (NUR LESEND)
 * ═════════════════════════════════════════════════════════════════════
 *
 * Track 6 von Phase 7. Beantwortet die eine Frage, die eine Testsuite
 * ueber Migrationsdateien nicht beantworten kann: ist das Schema
 * tatsaechlich ANGEWENDET?
 *
 * ── METHODE ──────────────────────────────────────────────────────────
 * PostgREST beantwortet eine unbekannte Spalte mit 42703, BEVOR es die
 * Rechte prueft. Damit laesst sich mit dem oeffentlichen Key
 * feststellen, ob eine Spalte existiert — ohne Daten zu sehen und ohne
 * etwas zu schreiben.
 *
 * Gleichzeitig ist der Statuscode der RLS-Nachweis:
 *   42501 / 401 / 403 → Tabelle ist fuer anon dicht (erwartet)
 *   200               → anon kann lesen (Befund, sobald Preise drinstehen)
 *
 * Diese beiden Aussagen kommen aus DERSELBEN Antwort — deshalb steht die
 * Spaltenprobe hier und nicht in der Vitest-Suite.
 *
 * ── ES WIRD NICHTS GESCHRIEBEN ───────────────────────────────────────
 * Ausschliesslich GET mit `limit=0`. Kein INSERT, kein UPDATE, kein
 * Preis. Das Skript ist beliebig oft wiederholbar.
 *
 * ── AUFRUF ───────────────────────────────────────────────────────────
 *   node scripts/verify-pricing-schema.mjs
 * Liest NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY aus
 * der Umgebung oder .env.local. Fehlen sie, endet es mit Exit 2
 * („nicht geprueft") — ausdruecklich NICHT mit Exit 0, sonst sieht ein
 * uebersprungener Lauf in CI aus wie ein bestandener.
 */

import { readFileSync, existsSync } from 'node:fs'

// ── Umgebung ─────────────────────────────────────────────────────────
if (existsSync('.env.local')) {
  for (const zeile of readFileSync('.env.local', 'utf8').split('\n')) {
    const t = zeile.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (t && !process.env[t[1]]) process.env[t[1]] = t[2].replace(/^["']|["']$/g, '')
  }
}

const URL_BASIS = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!URL_BASIS || !KEY) {
  console.error('NICHT GEPRUEFT — NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlt.')
  console.error('Das ist kein Bestehen. Exit 2.')
  process.exit(2)
}

// ── Sollzustand ──────────────────────────────────────────────────────
// Genau die Spalten, die 20260824_pricing_schema.sql anlegt.
const PFLICHT = {
  protect_pricing: [
    'id', 'risk_level', 'day_price_cents', 'month_price_cents',
    'year_price_cents', 'currency', 'active', 'updated_at',
  ],
  compliance_plans: [
    'id', 'plan_type', 'price_cents', 'included_submissions',
    'min_term_months', 'extra_submission_price_cents',
    'currency', 'active', 'updated_at',
  ],
}

/**
 * Spalten aus 20260826_pricing_gueltigkeit.sql. Ihr Fehlen ist KEIN
 * Fehler — die Migration ist bewusst noch nicht angewendet. Gemeldet wird
 * es trotzdem, damit der Stand ablesbar ist.
 */
const GUELTIGKEIT = ['effective_from', 'effective_to']

const befunde = []
let fehler = 0

function melde(stufe, text) {
  befunde.push({ stufe, text })
  const marke = stufe === 'OK' ? 'OK   ' : stufe === 'INFO' ? 'INFO ' : 'FEHLER'
  console.log(`${marke} ${text}`)
  if (stufe === 'FEHLER') fehler++
}

async function probe(tabelle, spalte) {
  const res = await fetch(
    `${URL_BASIS}/rest/v1/${tabelle}?select=${encodeURIComponent(spalte)}&limit=0`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: 'no-store' },
  )
  const text = await res.text()
  return { status: res.status, text }
}

// ── Lauf ─────────────────────────────────────────────────────────────
console.log('ChairMatch — Preis-Schema, Live-Verifikation (nur lesend)')
console.log('─'.repeat(64))

for (const [tabelle, spalten] of Object.entries(PFLICHT)) {
  const tab = await probe(tabelle, 'id')
  if (tab.text.includes('PGRST205')) {
    melde('FEHLER', `${tabelle}: Tabelle existiert nicht.`)
    continue
  }

  for (const spalte of spalten) {
    const { text } = await probe(tabelle, spalte)
    if (text.includes('42703')) melde('FEHLER', `${tabelle}.${spalte} fehlt — 20260824_pricing_schema.sql ist nicht angewendet.`)
    else melde('OK', `${tabelle}.${spalte} vorhanden`)
  }

  for (const spalte of GUELTIGKEIT) {
    const { text } = await probe(tabelle, spalte)
    if (text.includes('42703')) {
      melde('INFO', `${tabelle}.${spalte} fehlt — 20260826_pricing_gueltigkeit.sql ist (erwartet) nicht angewendet. Preise sind nicht zeitversioniert.`)
    } else {
      melde('OK', `${tabelle}.${spalte} vorhanden — Gueltigkeitsmigration ist angewendet.`)
    }
  }

  // ── RLS: darf anon lesen? ──
  // Steht hier ein 200 mit Zeilen, ist die Preisliste oeffentlich. Solange
  // die Tabelle leer ist, ist der Schaden null — mit Preisen waere es eine
  // Offenlegung der Kalkulation.
  const rls = await fetch(
    `${URL_BASIS}/rest/v1/${tabelle}?select=id&limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, cache: 'no-store' },
  )
  if (rls.status === 200) {
    const zeilen = await rls.json().catch(() => null)
    if (Array.isArray(zeilen) && zeilen.length > 0) {
      melde('FEHLER', `${tabelle}: anon liest ${zeilen.length} Zeile(n) — RLS/REVOKE aus 20260824 ist nicht wirksam.`)
    } else {
      melde('FEHLER', `${tabelle}: anon bekommt HTTP 200 (leere Liste). Die Tabelle ist offen; sie ist nur zufaellig leer.`)
    }
  } else {
    melde('OK', `${tabelle}: anon abgewiesen (HTTP ${rls.status}) — RLS greift.`)
  }
}

console.log('─'.repeat(64))
console.log(
  'Preise selbst werden hier NICHT geprueft und NICHT gesetzt: '
  + 'BUSINESS_INPUT_REQUIRED (siehe supabase/seed/pricing.seed.template.sql).'
)

if (fehler > 0) {
  console.error(`\n${fehler} Fehler. Exit 1.`)
  process.exit(1)
}
console.log('\nALLES GRUEN')
