# Admin-Panel – Was du steuern und kontrollierst

Übersicht aller Admin-Bereiche (bereits umgesetzt und geplant).

---

## Bereits umgesetzt

| Bereich | Route | Was du machst |
|--------|--------|----------------|
| **Dashboard** | `/admin` | KPIs (Salons, Buchungen, Bewertungen, User), Letzte Buchungen, Links zu allen Bereichen. |
| **Salons verwalten** | `/admin/anbieter` | Anbieter/Salons anzeigen, verwalten (Status, ggf. bearbeiten). |
| **Benutzer verwalten** | `/admin/benutzer` | Nutzer anzeigen, Rolle ändern (kunde/anbieter/admin). |
| **Buchungen** | `/admin/buchungen` | Alle Buchungen einsehen, Status, Filter. |
| **Statistik** | `/admin/statistik` | Statistische Auswertungen. |
| **Super-Admin** | `/admin/super` | Nur für Rolle `super_admin`: Einstellungen, Logo, Kategorien, Onboarding-Slides. |
| **Besucher / Analytics** | `/admin/besucher` | Wer kommt auf die App/Seite: IP, Herkunft (Land), besuchte Seiten, Zeit. *(wird ergänzt)* |

---

## Geplant (laut Roadmap)

| Bereich | Was du steuerst |
|--------|-----------------|
| **Dokumente prüfen** | Uploads von Anbietern/Standorten (Hygiene, Versicherung, Qualifikation) – freigeben/ablehnen, Ampel aktualisieren. |
| **Submission-Tickets** | Einreich-Service: Tickets (OPEN → IN_PROGRESS → SUBMITTED → DONE), Proof hochladen, Notizen. |
| **Risk-Settings** | Risk-Level pro Kategorie/Service (LOW/HIGH/VERY_HIGH), Overrides. |
| **Pricing** | Protect-Preise (HIGH/VERY_HIGH, Day/Month/Year), Compliance-/Einreich-Pläne (99€/299€/39€). |
| **Reviews-Moderation** | Gemeldete Bewertungen, auf published/hidden setzen. |
| **Audit-Logs** | Alle wichtigen Aktionen (Buchung, Review, Admin-Änderung) durchsuchbar anzeigen. |

---

## Kurz: Was du jetzt schon kontrollierst

- **Inhalte:** Kategorien, Onboarding-Slides, Logo (Super-Admin).
- **Nutzer & Anbieter:** Benutzerrollen, Salons/Anbieter-Liste.
- **Buchungen:** Alle Buchungen einsehen und kontextbezogen handeln.
- **Zahlen:** Statistik und KPIs auf dem Dashboard.
- **Besucher:** Sobald Besucher-Tracking läuft: wer kommt von wo (IP, Land, Seite).

Was noch fehlt, um „alles“ zu steuern: Dokumente, Risk, Protect-Preise, Einreich-Tickets, Review-Moderation, Audit-Logs-UI. Siehe ROADMAP.md.
