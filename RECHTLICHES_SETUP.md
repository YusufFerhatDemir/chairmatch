# RECHTLICHES_SETUP.md — Lean-Legal-Guide für ChairMatch

> **Was das hier ist:** Ein Schritt-für-Schritt-Leitfaden, wie du als Gründer die rechtlichen Pflicht-Texte über kostenlose Generatoren erstellst — ohne sofort € 5.000+ für einen Anwalt auszugeben.
>
> **Was das hier NICHT ist:** Rechtsberatung. Wir nutzen Generator-Output, der für 90 % der Standard-Marktplatz-Fälle funktioniert. Bei dem **rechtlich heißen 10 %** (Medizinrecht, Heilmittelwerbegesetz, Versicherungsvermittlung als Eigenvertrieb) brauchst du **trotzdem einen Anwalt**. Siehe §8.
>
> **Zielgruppe:** Yusuf — sich selbst beauftragend, in eigenem Tempo, kein Stress.

---

## 0. Big Picture — was wird wann gebraucht?

| Pflicht-Text | Wann zwingend? | Generator? | Aufwand |
|---|---|---|---|
| **Impressum** | Ab erster Live-Page | ✅ Ja, kostenlos | 10–15 Min |
| **Datenschutzerklärung** | Ab erster Live-Page | ✅ Ja, kostenlos | 30–45 Min |
| **Cookie-Consent-Banner** | Bei nicht-essentiellen Cookies/Tracking | ✅ Bereits live (Cookiebot/eigene Lösung — prüfen) | 0 (bereits vorhanden) |
| **AGB Kunde** | Bei Vertragsschluss mit Endnutzern | ✅ Ja | 45–60 Min |
| **AGB Anbieter / Marktplatz-Nutzung** | Bei B2B-Anbietern (P2B) | ✅ Ja, aber MIT Vorsicht | 60–90 Min |
| **Widerrufsbelehrung** | Bei Verbraucher-Verträgen | ✅ Amtliches Muster nutzen | 15 Min |
| **DSA-Melde-Funktion** (für Marktplätze) | Pflicht seit Feb. 2024 | Code-Page `/melden` | 60 Min |
| **Verkäufer-AGB (Shop / Affiliate)** | Vor Welle 1 Shop-Launch | ✅ Generator | 30 Min |
| **Drittanbieter-AGB** | Vor Welle 2 Launch | ✅ Generator | 45 Min |
| **🔴 Beauty-Tourismus-AGB + HWG-Freigabe** | Vor Welle 3 Launch | ❌ **NUR Anwalt** | € 3.000–8.000 |
| **🔴 Vermittlungsvertrag Versicherung** | Vor Eigenvermittlung | ❌ Anwalt + § 34d GewO Lizenz | € 2.000+ |

---

## 1. Impressum (TMG § 5)

### 1.1 Status

✅ **Bereits live** unter `/impressum` (`src/app/(public)/impressum/page.tsx`).
✅ Adresse und Name sind eingetragen (Yusuf Ferhat Demir, Schillerstraße 31, 60313 Frankfurt am Main).
🟡 **Noch zu ersetzen** (in der Datei stehen Platzhalter in Kommentaren):

```text
{{HANDELSREGISTERGERICHT}}    — z.B. „Amtsgericht Frankfurt am Main"
{{HRB_NUMMER}}                — z.B. „HRB 12345" (nach GmbH-Gründung)
{{UMSATZSTEUER_ID}}           — z.B. „DE123456789" (nach USt-Registrierung)
```

### 1.2 Generator nutzen (zur Qualitätssicherung)

Selbst wenn die Datei schon manuell befüllt ist, empfiehlt sich ein Quick-Check mit einem Generator, um nichts zu vergessen:

**Empfohlener Generator (kostenlos, deutsch, aktualisiert):**
- **e-recht24.de Impressum-Generator** — https://www.e-recht24.de/impressum-generator.html
- Alternative: **datenschutz-generator.de Impressum-Modul** — https://datenschutz-generator.de/

### 1.3 Schritt-für-Schritt

1. Generator-URL öffnen.
2. Felder ausfüllen:
   - **Diensteanbieter (Name/Firma):** ChairMatch ggf. mit Rechtsformzusatz, sobald Gründung durch ist
   - **Anschrift:** Schillerstraße 31, 60313 Frankfurt am Main
   - **Vertreten durch:** Yusuf Ferhat Demir
   - **Kontakt:** legal@chairmatch.de
   - **Registereintrag:** Aktuell **leer lassen** (Kleinunternehmer / GbR-Modus) — nach GmbH-Eintragung füllen
   - **USt-ID:** Aktuell **leer lassen** — nach Anmeldung beim Finanzamt füllen
   - **Aufsichtsbehörde:** Aktuell **nicht relevant** (keine erlaubnispflichtige Tätigkeit in Welle 1) — wenn Welle 2 Versicherungs-Vermittlung kommt: **IHK Frankfurt** als Aufsicht
3. Generator-Output mit der bestehenden Page abgleichen, neue Punkte hinzufügen.
4. Wenn alle Platzhalter im Code befüllt sind: Datei deployen.

### 1.4 Was Yusuf noch konkret liefern muss (Platzhalter-Liste)

| Platzhalter | Wann nötig? | Quelle |
|---|---|---|
| `{{HANDELSREGISTERGERICHT}}` | Nach GmbH-Gründung | Notar / Handelsregister-Auszug |
| `{{HRB_NUMMER}}` | Nach GmbH-Gründung | Handelsregister-Auszug |
| `{{UMSATZSTEUER_ID}}` | Nach USt-Registrierung | Finanzamt-Bescheid |
| `{{IHK_REGISTRIERUNGS_NUMMER}}` | Nur bei Welle-2-Versicherung mit Eigenlizenz | IHK |

---

## 2. Datenschutzerklärung (DSGVO)

### 2.1 Status

✅ **Bereits live** unter `/datenschutz` (`src/app/(public)/datenschutz/page.tsx`).
🟡 **Aktuell als „technisches Gerüst"** im Code-Kommentar markiert — vor Welle-1-Launch durch sauberen Generator-Text ersetzen ODER ergänzen.

### 2.2 Empfohlener Generator

**Datenschutz-Generator.de** (von RA Dr. Schwenke) — https://datenschutz-generator.de/
- Kostenlos, sehr ausführlich, aktualisiert
- Modular: man wählt nur die Module, die zur eigenen Seite passen
- Output ist Standard für 90 % der deutschen Web-Projekte

**Alternative**: e-recht24.de Datenschutz-Generator (etwas weniger granular, aber auch gut).

### 2.3 Welche Module / Verarbeitungen bei ChairMatch ankreuzen?

**Pflicht-Module (immer ankreuzen)**:

- [x] Verantwortlicher (Name, Adresse, Kontakt)
- [x] Allgemeine Hinweise (Betroffenenrechte: Auskunft, Berichtigung, Löschung, Datenübertragbarkeit)
- [x] Aufsichtsbehörde (Hessischer Datenschutzbeauftragter, da Frankfurt-Sitz)
- [x] Kontaktaufnahme (E-Mail, Kontaktformular)
- [x] Server-Logfiles
- [x] Cookies (essentielle + optionale)

**Tech-Stack-spezifisch (für ChairMatch)**:

- [x] **Vercel** — Hosting (Server-Logs, IP-Speicherung kurz)
- [x] **Supabase** — Datenbank + Auth (EU-Server prüfen, sonst Standardvertragsklauseln)
- [x] **Resend** — Transaktionale E-Mails (USA-Empfänger; SCCs nötig)
- [x] **Stripe** — Zahlungsabwicklung (USA-Empfänger; SCCs + Stripe-Auftragsverarbeitungsvertrag)
- [x] **ggf. Google Analytics / Plausible / etc.** — was tatsächlich eingebaut ist
- [x] **Push Notifications** (falls aktiviert via Capacitor / Service Worker)
- [x] **Marketing-E-Mails** (Newsletter-Modul, Double-Opt-In)

**Marktplatz-spezifisch**:

- [x] Profilverwaltung (Anbieter, Vermieter, Mieter)
- [x] Bewertungen / Rezensionen (öffentlich + intern)
- [x] Nachrichten zwischen Marktplatz-Teilnehmern
- [x] Buchungs-/Mietvertrags-Daten

**NICHT ankreuzen (nicht im Einsatz)**:

- [ ] Facebook-Pixel
- [ ] Hotjar
- [ ] LinkedIn-Tracking
- [ ] Eigene Werbung in Drittnetzwerken

### 2.4 Schritt-für-Schritt

1. Generator öffnen → „Konfigurator starten".
2. Sprache: Deutsch.
3. Konfigurations-Schritte durchklicken — bei jedem Modul: „Habe ich das?" Wenn ja, ankreuzen, sonst überspringen.
4. **Auftragsverarbeitungs-Verträge prüfen**: für Supabase, Resend, Stripe und Vercel jeweils im Dashboard einen AVV / DPA anschauen und unterschreiben. Das ist neben der Datenschutzerklärung **gesetzliche Pflicht** (Art. 28 DSGVO).
5. Generator-Output kopieren, in `src/app/(public)/datenschutz/page.tsx` einsetzen.
6. **Wichtig**: am Ende den vom Generator gelieferten „Stand: TT.MM.JJJJ"-Hinweis aktualisieren.
7. Deploy.

### 2.5 AVV-Pflicht-Checkliste (Art. 28 DSGVO)

| Dienst | AVV nötig? | Wo abrufen? |
|---|---|---|
| Vercel | ✅ | vercel.com/legal/dpa |
| Supabase | ✅ | supabase.com/legal/dpa |
| Resend | ✅ | resend.com/legal/dpa |
| Stripe | ✅ | stripe.com/legal/dpa |
| Cloudinary / Bildhosting (wenn genutzt) | ✅ | im Account |
| Plausible / Analytics (wenn genutzt) | ✅ | im Account |

**Anleitung Yusuf**: bei jedem Dienst-Login im Footer/Settings nach „DPA" oder „Datenschutz" suchen, akzeptieren / unterschreiben. Bei Stripe: oft auch im Onboarding-Flow integriert.

---

## 3. AGB (Kunden) + Marktplatz-Nutzungsbedingungen

### 3.1 Status

✅ **Bereits live**: `/agb` (Kunde) + `/agb-provider` (Anbieter).
🟡 Markiert als „technisches Gerüst" — vor Welle-1-Launch durch Generator-Text gegenchecken.

### 3.2 Empfohlene Generatoren

**Für AGB-Standard (Kunden-Verträge):**
- **Trusted Shops Rechtstexter** (kostenlos für Standard, kostenpflichtig für komplex) — https://legal.trustedshops.com/
- **e-recht24.de AGB-Generator (Premium-Mitgliedschaft, ca. € 8/Monat)** — https://www.e-recht24.de/agb-generator/
- **IT-Recht-Kanzlei.de** (Schutzpaket-Abo, ca. € 10/Monat) — sehr aktuell, mit Update-Service

**Für Plattform-/Marktplatz-Bedingungen (B2B, P2B-Verordnung)**:
- Trusted Shops und IT-Recht-Kanzlei haben **spezielle Marktplatz-Module**, die die P2B-Verordnung (EU 2019/1150) abdecken — das ist der entscheidende Punkt für ChairMatch.

### 3.3 Pflicht-Bestandteile (Marktplatz)

Beim Konfigurieren sicherstellen, dass diese Punkte drin sind:

**Allgemein (alle AGB)**:
- [x] Geltungsbereich, Vertragsparteien
- [x] Vertragsschluss, Angebot, Annahme
- [x] Preise, Zahlung, Fälligkeit
- [x] Storno-/Widerrufsrecht (verlinkt auf separate Widerrufsbelehrung)
- [x] Gewährleistung, Haftung
- [x] Streitbeilegung (EU-ODR)

**Marktplatz-Spezifika (kritisch — bei Standardgenerator nachlesen!)**:
- [x] **Vermittler-Rolle explizit**: „ChairMatch ist ausschließlich Vermittler. Verträge kommen zwischen Anbieter und Endnutzer zustande. ChairMatch ist nicht Vertragspartner der vermittelten Leistung."
- [x] **Haftungsausschluss für Anbieter-Leistungen**: „Für Qualität, Rechtzeitigkeit oder Mangelhaftigkeit der vermittelten Leistungen haftet ausschließlich der jeweilige Anbieter."
- [x] **Produkthaftung Shop**: „Bei Produkt-Bestellungen im ChairMatch-Shop haftet der jeweilige Verkäufer gemäß § 1 ProdHaftG. ChairMatch ist nicht Vertriebspartei."
- [x] **DSA-Konformität**: Hinweis auf Melde-Funktion `/melden`, 24h-Antwortzeit.
- [x] **P2B (für Anbieter-AGB)**: Kündigungsfristen, Sperrungs-Gründe, Beschwerdestelle.
- [x] **Bewertungen**: Hinweis, dass nur **verifizierte Käufer/Mieter** bewerten können (Authenticity-Pflicht für Marktplätze), Hinweis auf Melde-Funktion bei Fake-Bewertungen.

### 3.4 Schritt-für-Schritt

1. Generator-Anbieter wählen (Empfehlung: **Trusted Shops Rechtstexter** für Kosten/Nutzen-Verhältnis; **IT-Recht-Kanzlei** wenn lokales Anwalts-Support gewünscht).
2. Geschäftsmodell konfigurieren:
   - Branche: „Sonstiges / Plattform"
   - Modell: „Online-Marktplatz mit Vermittlertätigkeit"
   - B2C **und** B2B
   - Marktplatz-Modul aktivieren (P2B-Verordnung)
3. Output gegenchecken: Sind alle Punkte aus §3.3 drin? Falls Punkte fehlen, manuell ergänzen — Mustertexte z.B. aus der **DSGVO-Anwaltliste** oder **Bundesgerichtshof-Urteilen** zu Marktplatz-Haftung (BGH VI ZR 175/19).
4. In `src/app/(public)/agb/page.tsx` einsetzen.
5. Analog für `/agb-provider/page.tsx` (Anbieter-AGB mit P2B-Fokus).
6. Deploy.

### 3.5 Verkäufer-AGB (Shop / Bereich 3)

Vor Welle-1-Shop-Launch zusätzlich erstellen: `/agb-verkaeufer`.

Schwerpunkte:
- **Produkthaftung beim Verkäufer**: § 1 ProdHaftG, Pflicht zur Marktüberwachung, Rückruf-Mechanik.
- **Verkäufer-Verifikation**: Verkäufer muss bei Anmeldung Identität nachweisen (Gewerbeschein, USt-ID).
- **Versand & Rückgabe**: Verantwortung beim Verkäufer.
- **ChairMatch-Marge / Provision**: transparent angeben.

### 3.6 Drittanbieter-AGB (Bereich 2)

Vor Welle-2-Launch: `/agb-drittanbieter`.

Schwerpunkte:
- **Antragsservice Gesundheitsamt — Disclaimer-Pflicht**:

  > „Der Antragsservice umfasst ausschließlich die formale Bearbeitung und Einreichung der Antragsunterlagen beim zuständigen Gesundheitsamt. **ChairMatch übernimmt KEINE Garantie für die Genehmigung, KEINE Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG), KEINE Erfolgshaftung.** Verantwortung für inhaltliche Richtigkeit, Vollständigkeit und Einhaltung gesundheits- und gewerberechtlicher Vorgaben liegt vollständig beim Drittanbieter."

- **Raum-Vermietung vs. Behandlungs-Vermittlung**: ChairMatch vermittelt **nur Räume**, NIE Behandlungen.
- **Werberestriktionen HWG**: Hinweis, dass Drittanbieter selbst HWG-konform werben muss.

---

## 4. Widerrufsbelehrung

### 4.1 Status

✅ **Bereits live** unter `/widerruf` — bereits am amtlichen Muster (Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB) orientiert.

### 4.2 Was prüfen?

1. Generator: e-recht24.de bietet Widerrufsbelehrungs-Generator — Quick-Check ob Mustertext aktuell.
2. **Dienstleistungs-Sonderfall**: bei Stuhlmiete-Verträgen (Welle 1) gilt das Widerrufsrecht **bei Verbraucherverträgen**. Da Mieter meist Freelancer (B2B) sind, **gilt es oft NICHT**. Aber Vorsicht: Wenn ChairMatch nicht eindeutig zwischen B2B und B2C unterscheiden kann, lieber Belehrung anbieten.
3. **Hinweis auf Erlöschen** bei vollständiger Dienstleistungs-Erbringung vor Widerrufsfrist (z.B. eintägige Stuhlmiete).
4. **Verlinkung in AGB** und im Checkout-Flow (gesetzliche Pflicht für E-Commerce).

---

## 5. Cookie-Consent / Tracking

### 5.1 Status

🟡 **Status prüfen**: `/cookie-settings` existiert. Frage: Wird auf jeder Seite **vor** Setzen nicht-essentieller Cookies ein Consent-Banner gezeigt?

### 5.2 Anforderungen (TTDSG § 25 + DSGVO)

- Banner muss **erscheinen, bevor** irgendwelche nicht-essentiellen Cookies gesetzt werden (auch Analytics).
- Banner-Buttons: „Alle akzeptieren" UND „Nur essentiell" **gleichwertig prominent** (gleicher Style).
- Granulare Auswahl (essentielle / Analytics / Marketing).
- Widerruf jederzeit möglich (Link in Footer + `/cookie-settings`).

### 5.3 Generator / Tool

- **Cookiebot** (kostenlos bis 50 Subseiten) — https://www.cookiebot.com/
- **Klaro!** (Open Source, selbst hosten) — https://klaro.org/
- **Iubenda** (kostenpflichtig, einfach) — https://www.iubenda.com/

**Empfehlung**: Wenn die bestehende `/cookie-settings`-Page eine Eigenimplementierung ist, mit Cookiebot-Standard gegenchecken. Wenn unklar: zu Cookiebot wechseln (50-Page-Limit reicht für Welle 1).

---

## 6. DSA-Melde-Funktion (Digital Services Act, seit Feb. 2024)

### 6.1 Was?

Pflicht für **Online-Marktplätze, Hosting-Plattformen, soziale Netzwerke**: einfache, niedrigschwellige Melde-Funktion für rechtswidrige Inhalte.

ChairMatch ist als Marktplatz **eindeutig betroffen**.

### 6.2 Was bauen?

Neue Page: `/melden` (siehe IA-Doc P-95).

**Mindest-Anforderungen**:

- [x] Formular zum Melden von Inhalten / Anbietern / Bewertungen
- [x] Kategorien-Auswahl:
  - Fake-Bewertung
  - Falscher / betrügerischer Anbieter
  - Illegale Inhalte (Hate-Speech, Diskriminierung)
  - Urheberrechtsverletzung
  - Datenschutzverletzung
  - Sonstiges
- [x] Pflichtfelder: betroffene URL, kurze Beschreibung, Kontakt-E-Mail des Melders
- [x] **Bestätigungs-E-Mail** an Melder mit Vorgangsnummer
- [x] Antwortpflicht innerhalb **24 Stunden** (Eingangsbestätigung) bzw. **48 Stunden** (erste Stellungnahme).
- [x] **Trusted-Flagger-Privileg**: Behörden + zertifizierte Stellen werden bevorzugt bearbeitet (für Welle 1 vereinfacht durch Hinweis auf legal@chairmatch.de).
- [x] **Transparenz-Report** (jährlich; für Welle 1 manuell als PDF, später automatisiert).

### 6.3 Implementierung

Vorschlag Modul 3:
- Page `/melden` mit React-Formular
- API-Route `/api/melden` → schreibt in Supabase-Tabelle `dsa_reports` + verschickt E-Mail an `legal@chairmatch.de`
- Admin-Panel-Erweiterung: Liste aller offenen Meldungen

### 6.4 Bewertungs-Fake-Schutz

Zusätzlich zur `/melden`-Page:
- Bewertungen nur von **verifizierten Käufern/Mietern** (Buchung muss tatsächlich stattgefunden haben).
- „Diese Bewertung melden"-Button **direkt** an jeder Bewertung.

---

## 7. Welle-Specific Legal-Checklisten

### 7.1 Welle 🟢 1 — Vermietung + Shop (sofort live)

**Vor Live-Schalten**:
- [x] Impressum live (✅ schon da)
- [x] Datenschutz live (✅ schon da, Generator-Update empfohlen)
- [x] AGB Kunde live (✅ schon da, Generator-Update empfohlen)
- [x] AGB Provider/Vermieter live (✅ schon da)
- [ ] **AGB Verkäufer** (vor Shop-Launch) — neu zu erstellen
- [x] Widerruf live (✅ schon da)
- [ ] **DSA-Melde-Funktion** `/melden` — neu zu erstellen
- [ ] Cookie-Banner DSGVO-konform überprüft
- [ ] AVVs unterschrieben (Vercel, Supabase, Resend, Stripe)

**Restrisiko Welle 1**: niedrig. Standard-Marktplatz-Modell mit Generator-Texten ist seit Jahren etabliert.

### 7.2 Welle 🟡 2 — Drittanbieter + Versicherung

**Vor Live-Schalten**:
- [ ] **AGB Drittanbieter** mit klarem RDG-/Erfolgshaftungs-Disclaimer
- [ ] Versicherungs-Vergleich nur als **Affiliate** (keine Eigenvermittlung) — Disclaimer auf jeder Page
- [ ] Wenn Eigenvermittlung geplant: § 34d GewO Lizenz beantragen → Anwalt + IHK
- [ ] Antragsservice Gesundheitsamt: 100 % wasserdichte Formulierung „Bearbeitung, nicht Beratung"

**Restrisiko Welle 2**: mittel. Antragsservice ist die rechtlich kniffligste Stelle — eine Falsch-Formulierung könnte als Rechtsdienstleistung nach RDG ausgelegt werden (das wäre illegal ohne Erlaubnis).
**Empfehlung**: **vor Welle-2-Launch trotzdem einen Anwalt 1–2h drüber lesen lassen** (€ 300–600).

### 7.3 Welle 🔴 3 — Beauty-Tourismus (HART GATED)

**Vor Live-Schalten — ALLE Punkte zwingend**:
- [ ] **Medizinrecht-/HWG-Anwalt** schriftlich gegengelesen
- [ ] AGB-Beauty-Reisen anwaltlich erstellt (nicht Generator!)
- [ ] HWG-Konformität geprüft:
  - § 3 HWG (keine irreführende Werbung)
  - § 11 HWG (Vorher/Nachher-Bilder nur unter strengen Bedingungen)
  - § 12 HWG (keine Werbung mit fachlichen Empfehlungen außer durch Ärzte)
- [ ] Anbieter-Vetting-Prozess dokumentiert (Approbation, Klinik-Lizenz, Versicherung)
- [ ] Reisemedizinische Risiko-Aufklärung auf jeder Behandlungs-Page
- [ ] Streitbeilegung grenzüberschreitend (Türkei ↔ Deutschland) geklärt
- [ ] Datenschutz-Drittland-Transfer (Gesundheitsdaten in die Türkei → besonders sensibel, Art. 9 DSGVO)
- [ ] **Schriftliche Freigabe-Dokumentation** in `docs/legal/HWG-FREIGABE.md` (Hash-Datum-Anwalt)

**Restrisiko ohne Anwalt**: **inakzeptabel hoch**. HWG-Verstöße werden teilweise sechsstellig abgemahnt. Wettbewerbszentrale klagt routinemäßig gegen Plattformen, die Behandlungs-Marketing ohne ärztliche Distanz machen.

**Budget Anwalts-Initial**: € 3.000–8.000 (einmalig). Jährliches Update: € 1.000–2.000.

---

## 8. Wann ist der Anwalt UNVERMEIDLICH?

| Trigger | Warum? | Welcher Anwalt? |
|---|---|---|
| Welle 3 Launch (Beauty-Tourismus) | HWG + Medizinrecht + Drittland-Datenschutz | Medizinrecht + Wettbewerbsrecht |
| Eigenvermittlung Versicherungen (Welle 2 Skalierung) | § 34d GewO Lizenz nötig | Versicherungsrecht / Gewerbe |
| Erste Massen-Abmahnung erhalten | Standardvorgehen | IT-Recht / Wettbewerbsrecht |
| Erste Klage von Vertragspartner | offensichtlich | je nach Sache |
| Skalierung > 1 Mio EUR Umsatz | DSGVO-Audit, GmbH-Strukturen, Steuer | mehrere Spezialisten |
| GmbH-Gründung | Gesellschaftsvertrag | Notar + Gesellschaftsrecht |
| Internationale Expansion | je Land neue Pflichten | EU-Recht |
| Investoren-Runde | Term-Sheet-Prüfung | Venture-Recht |

**Empfehlung Lean-Start**:
- Welle 1 + 2: Generator + ggf. 1–2h Anwalts-Quickreview für AGB-Drittanbieter (~€ 400).
- Welle 3: Anwalt **zwingend, einmalig € 3-8k**, dann jährliches Update.

---

## 9. Was Yusuf JETZT konkret tun muss

### 9.1 Sofort (vor Welle-1-Launch)

1. **Impressum-Platzhalter füllen** (nach GmbH/USt-Status, siehe §1.4)
2. **Datenschutzerklärung** mit `datenschutz-generator.de` neu generieren und in `/datenschutz` einsetzen (siehe §2)
3. **AGB Kunde + Provider** mit Trusted Shops oder IT-Recht-Kanzlei generieren, einsetzen (siehe §3)
4. **AVVs unterschreiben**: Vercel, Supabase, Resend, Stripe — alle im jeweiligen Dashboard (siehe §2.5)
5. **DSA-Melde-Funktion** `/melden` als Story für Modul 3 anlegen (siehe §6)
6. **AGB Verkäufer** generieren vor Shop-Hard-Launch
7. **Cookie-Banner** auf TTDSG-Konformität prüfen (siehe §5)

### 9.2 Innerhalb 4–8 Wochen (vor Welle 2)

1. **AGB Drittanbieter** generieren + Anwalts-Quickreview (~€ 400)
2. **Versicherungs-Affiliate-Disclaimer** auf den Pages
3. Antragsservice-Formulierung: 100 % wasserdicht „nur Bearbeitung, keine Beratung"

### 9.3 Vor Welle 3 (Beauty-Tourismus)

1. **Medizinrecht-Anwalt suchen** (Empfehlung: in Frankfurt vor Ort oder Berlin spezialisiert)
2. Budget € 3-8k freistellen
3. Anbieter-Vetting-Prozess dokumentieren
4. Schriftliche Freigabe in `docs/legal/HWG-FREIGABE.md` hinterlegen (Hash + Datum + Anwalts-Name)
5. **DANN ERST** `WELLEN_FREIGABE.beauty_reisen = true` setzen + Deploy

---

## 10. Disclaimer (für dieses Dokument selbst)

Dieses Dokument ist **eine Implementierungs-Hilfe**, keine Rechtsberatung. Es dokumentiert den **Lean-Setup-Pfad** für ein Standard-Marktplatz-Modell mit allgemeinen Compliance-Anforderungen. Bei Unsicherheit, bei rechtlich komplexen Bereichen (insbesondere Welle 3) oder bei Skalierung über € 1 Mio Umsatz wendet sich der Gründer an einen spezialisierten Rechtsanwalt.

Quellen, die hier referenziert werden, wurden zum Stand 23.05.2026 als aktuell angesehen. Rechtsprechung und Gesetzeslage ändern sich — eine periodische Re-Evaluation (alle 6–12 Monate) ist empfohlen.

---

## 11. Cheat-Sheet (Single-Page-Übersicht für Yusuf)

```
JETZT MACHEN:
  □ Datenschutzerklärung neu via datenschutz-generator.de
  □ AGB Kunde + Provider neu via Trusted Shops oder IT-Recht-Kanzlei
  □ AVVs unterschrieben: Vercel, Supabase, Resend, Stripe
  □ /melden-Page als Modul-3-Story angelegt
  □ AGB Verkäufer vor Shop-Launch erstellt

PLATZHALTER NACH GRÜNDUNG/REGISTRIERUNG FÜLLEN:
  □ {{HANDELSREGISTERGERICHT}}
  □ {{HRB_NUMMER}}
  □ {{UMSATZSTEUER_ID}}

VOR WELLE 2 (in 4-8 Wochen):
  □ AGB Drittanbieter mit Anwalt-Quickreview (€ 400)
  □ Antragsservice-Formulierung wasserdicht

VOR WELLE 3 (gated):
  □ Medizinrecht-Anwalt beauftragt (€ 3-8k)
  □ HWG-Freigabe in docs/legal/HWG-FREIGABE.md
  □ WELLEN_FREIGABE.beauty_reisen = true
```
