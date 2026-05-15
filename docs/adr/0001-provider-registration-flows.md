# ADR 0001: Drei Provider-Registrierungs-UIs, ein Backend

**Status:** Accepted
**Datum:** 2026-05-14
**Autor:** Cowork-Session

## Kontext

Wir haben drei UI-Komponenten, die alle Provider-Registrierung handhaben:

1. **`OnboardingGate.tsx`** (509 LOC)
   - First-Visit-Overlay
   - Slides → Rollen-Wahl → Inline Registrierung
   - Triggered automatisch beim ersten Besuch eines unauthentifizierten Users
   - Auch nutzbar als "Account erstellen"-Modal von beliebiger Stelle aus

2. **`/register/anbieter` Page** (354 LOC)
   - Eigenständige SEO-/Marketing-Deep-Link-Page
   - Vollbild-Form mit Hero-Header
   - Target: User die über Anbieter-Funnel-Seiten reinkommen (`/anbieter/wie-es-funktioniert`, Magazin, Suchmaschinen)
   - Optimiert für Conversion über SEO-Akquise

3. **`onboarding/ProviderSetupWizard.tsx`** (416 LOC)
   - Wiederverwendbarer Multi-Step-Wizard
   - Aktuell von OnboardingGate genutzt
   - Standalone-fähig (für zukünftige Settings-Page "Anbieter-Profil aktivieren")

## Entscheidung

**Konsolidierung auf eine UI ist explizit NICHT angestrebt.** Begründung:

### Wirtschaftlich

Die drei UIs bedienen unterschiedliche Akquise-Funnels mit anderen Conversion-Optimierungen:

- **OnboardingGate** maximiert Newcomer-Conversion (Slides erklären Wertversprechen vor dem Form-Friction)
- **/register/anbieter** maximiert SEO-Conversion (Hero + Trust-Badges + USP über der Fold)
- **ProviderSetupWizard** maximiert Re-Activation-Conversion (User ist eingeloggt, will Profil-Upgrade)

Eine Eine-Größe-für-alle-UI würde Conversion-Rate in ALLEN drei Funnels reduzieren.

### Technisch

Backend ist **bereits konsolidiert**. Alle drei UIs POSTen gegen `/api/register-provider`:

```typescript
// OnboardingGate.tsx:181
const res = await fetch('/api/register-provider', { ... })

// /register/anbieter/page.tsx:320
const res = await fetch('/api/register-provider', { ... })

// ProviderSetupWizard.tsx (used internally by OnboardingGate)
// → also via OnboardingGate → /api/register-provider
```

Die Datenshape ist identisch (Zod-Schema in der Route). Drift-Risiko ist minimal, weil Validierung backend-side erfolgt.

### Maintenance-Risiko

Eine Aufspaltung in 3 UIs kostet:
- 3× UI-Tests (vs. 1×)
- 3× UX-Änderungen pro Feature-Update

Aber: jede UI-Komponente ist eigenständig schmal genug (354-509 LOC), und der gemeinsame State-Shape ist im Backend gekapselt. Maintenance-Schmerz ist überschaubar.

## Konsequenzen

### Akzeptiert

- Drei separate UI-Komponenten mit teilweise duplizierten Form-Feldern
- Bei Form-Field-Änderungen (z.B. neue Salon-Kategorie): in allen drei Components updaten

### Verbessert

- Backend ist Source-of-Truth (Zod-Validierung in `/api/register-provider`)
- ProviderSetupWizard ist als Pure-Component extrahiert — auch außerhalb OnboardingGate nutzbar
- Cross-References in den Files (siehe unten) verhindern stillen Drift

### Migrationspfad (wenn doch konsolidiert wird)

Falls eine zukünftige Cowork-Session diese Konsolidierung doch will, ist der Pfad:

1. **Phase A**: Extrahiere `ProviderRegistrationForm` als Pure-Component (nur Form + Validierung, kein Wrapper)
2. **Phase B**: OnboardingGate nutzt `<ProviderRegistrationForm slides={...} />`
3. **Phase C**: `/register/anbieter` nutzt `<ProviderRegistrationForm hero={...} />`
4. **Phase D**: ProviderSetupWizard wird zur Compatibility-Hülle die `<ProviderRegistrationForm />` rendert

Aufwand: ~2 Tage. Test-Aufwand: kritisch (alle drei Funnels durchspielen).

## Bezogene Files

- `src/components/OnboardingGate.tsx` — First-Visit-Flow
- `src/app/(public)/register/anbieter/page.tsx` — Deep-Link-Page
- `src/components/onboarding/ProviderSetupWizard.tsx` — Reusable Wizard
- `src/components/onboarding/SlidesPanel.tsx` — Slides für OnboardingGate
- `src/app/api/register-provider/route.ts` — Single Backend
