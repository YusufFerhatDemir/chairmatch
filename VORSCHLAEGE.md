# ChairMatch — Vorschläge & Erledigte Punkte

**Bildliche Übersicht der Icon-Stile:** Siehe Datei **`vorschlaege-icon-stile.png`** im Projektroot (5 Stil-Optionen auf einen Blick).

---

## 1. Icon- & Design-Vorschläge (wenn Icons nochmal angepasst werden)

**Brand:** Dunkler Hintergrund, Gold (#C8A84B, #E8D06A, #F5E080), Premium Beauty/Barber.

| Option | Beschreibung | Wann sinnvoll |
|--------|--------------|----------------|
| **Ein Stil für alle** | Alle Kategorie-Icons im gleichen Stil (nur Illustration ODER nur Symbol), gleiches Seitenverhältnis (z. B. 256×384), einheitlicher Gold-Kontrast | Wenn aktuell zu gemischt wirkt |
| **Line-Icons + Gold-Glow** | Klare Linien, einheitliche Strichstärke, leichter Gold-Glow (z. B. drop-shadow). Modern, aufgeräumt | Wenn es cleaner wirken soll |
| **Flache Gold-Silhouetten** | Reduzierte Formen (Stuhl, Schere, Nagel, Liege …), einheitlich in Gold oder Gold→Dunkel-Verlauf | Wenn es weniger „Foto“, mehr Icon sein soll |
| **Leicht 3D + weiche Schatten** | Wie aktuelle PNGs, aber einheitliche Gold-Palette und weiche Schatten für alle Kategorien | Wenn Konsistenz zwischen Karten fehlt |
| **Minimal + Text** | Icons sehr reduziert, Kategorie-Name trägt die Hauptinfo | Wenn Icons zu dominant wirken |

**Praktisch:**  
- Zu bunt/unterschiedlich → Option „Ein Stil“ + Gold-Silhouetten.  
- Zu flach → Line + Glow oder 3D.  
- Zu groß/ablenkend → Minimal + Fokus auf Text.

---

## 2. Technisch & rechtlich — Erledigt

### Rechtlich (Next-App)

| Punkt | Status |
|-------|--------|
| **Datenschutz** | Seite `/datenschutz` vorhanden, DSGVO-relevant, Platzhalter für Adresse/Telefon (bitte eintragen) |
| **Impressum** | Seite `/impressum` vorhanden, § 5 TMG, Platzhalter für Adresse/Telefon/USt-ID (bitte eintragen) |
| **AGB** | Seite `/agb` ergänzt; Verlinkung in Konto, Registrierung und Consent |
| **Consent-Banner** | Verlinkt auf Datenschutz |
| **Account „Rechtliches“** | Links zu Datenschutz, Impressum, AGB, Anbieter-Registrierung |
| **Sitemap** | `/datenschutz`, `/impressum`, `/agb` aufgenommen |
| **Middleware** | `/datenschutz`, `/impressum`, `/agb` als öffentliche Pfade |

### Technisch

| Punkt | Status |
|-------|--------|
| **V2 Icons (Legacy)** | In `index_legacy.html` umgesetzt (CSS, catIcons, logoHeader, rentalIcon, Onboarding) |
| **Public Routes** | Datenschutz, Impressum, AGB ohne Login erreichbar |
| **AGB-Checkbox (Anbieter-Reg.)** | Verweist auf AGB & Datenschutz (Links im Text möglich) |

### Noch von dir eintragen (rechtlich verbindlich)

- **Impressum/Datenschutz:** [Straße + Hausnummer], [PLZ Stadt], [Telefonnummer], ggf. [USt-ID] oder „Kleinunternehmer gem. § 19 UStG“ in den Seiten `/impressum` und `/datenschutz` ersetzen.

---

## 3. Optional / später

- Zahlungsintegration, Push-Benachrichtigungen, echte Karte/Navigation, Kalender-Sync.
- Legacy-SPA: Wenn du sie weiter nutzt, könnten Links zu `https://chairmatch.de/datenschutz`, `/impressum`, `/agb` eingebaut werden, damit eine Domain für alle Rechtstexte gilt.

---

*Stand: März 2026*
