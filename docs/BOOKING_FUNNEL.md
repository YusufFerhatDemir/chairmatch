# Der Buchungs-Funnel — was steht, was fehlt

> Stand 12.09.2026 · jede Zeile am Code nachgesehen, nicht aus dem
> Gedaechtnis. Stripe ist per Auftrag DEFERRED und hier nur als Tatsache
> vermerkt, nicht als Aufgabe.

| # | Stufe | Stand | Wo |
|---|---|---|---|
| 1 | Kunde | ✅ | NextAuth + `profiles`; Rolle pro Request aus der DB (`modules/auth/session.ts`) |
| 2 | Salon / Workspace | ✅ | `/salon/[slug]`, `/listings/[slug]`, `/api/rental-listings`; gesperrte Anbieter fliegen raus (`salonIsNotBlocked`) |
| 3 | Termin | ✅ | `createBooking`, `/api/availability`, Öffnungszeiten- und Feiertagsriegel |
| 4 | Zahlung | ⚠️ **DEFERRED** | Code vollständig, Stripe in Produktion **nicht konfiguriert** — Webhook antwortet `500 "Webhook not configured"` |
| 5 | Storno | ⚠️ **halb** | `cancelBooking` + Statusmaschine stehen. Für eine **Stornogebühr gibt es keine Spalte** — `booking_policies` führt nur `no_show_fee_cents` |
| 6 | No-Show | ✅ | `markNoShow`, `no_show_fee_cents` |
| 7 | Bewertung | ✅ | `reviews`, `publish_review_pair`, Cron `/api/cron/publish-reviews` |
| 8 | **Streitfall** | ❌ **fehlt ganz** | kein Fall, kein Status, keine Frist — **aber öffentlich zugesagt** |
| 9 | **Rechnung** | ❌ **fehlt ganz** | kein Beleg, kein PDF, kein Nummernkreis |

Die Statusmaschine selbst ist in Ordnung: `VALID_TRANSITIONS`
(`modules/booking/booking.types.ts`) ist die einzige Quelle, `booking.actions`
fragt sie über `validateTransition` ab, und die Groß-/Kleinschreibung wird
dort normalisiert (der Fall ist im Code kommentiert — ohne Normalisierung
hätte **keine** Transition gegriffen).

---

## 8 · Streitfall — eine Zusage ohne Vorgang

Die Plattform verspricht das öffentlich an mindestens drei Stellen:

- `/mieter/wie-es-funktioniert`: „Reklamation per Email → **Streit-Schlichtung
  in 48h**, oft mit Gutschein-Ausgleich"
- `seo-data/magazin.ts`: „Auf ChairMatch: **Streit-Schlichtung in 48h**,
  Stripe-Zahlungs-Garantie"
- `seo-data/magazin.ts`: „Auf ChairMatch: **integrierte Schlichtung**"

Im Code gibt es davon nichts. Volltextsuche `dispute` in `src/`: drei
Treffer, und keiner ist einer — zwei stammen aus Stripes eigenen Ereignissen
(`charge.dispute.*` im Webhook, die Rückstellung im Payout-Cron), der dritte
ist die Audit-Log-Ansicht. Keine Tabelle, kein Status, keine Frist, keine
Benachrichtigung, niemand der 48 Stunden zählt.

Der Zusatz „Stripe-Zahlungs-Garantie" ist zusätzlich **sachlich falsch**:
Stripe ist in Produktion nicht konfiguriert.

**Warum hier nichts gebaut wurde:** Eine Schlichtung ist kein CRUD. Sie
braucht eine Zuständigkeit (wer entscheidet?), eine Frist mit Folge (was
passiert nach 48 Stunden?), eine Wirkung auf Geld (Gutschein? Erstattung?
Teilerstattung?) und eine Beweislage. Das sind Produkt- und
Rechtsentscheidungen. Sie im Code zu erfinden wäre dieselbe Klasse Fehler
wie ein erfundener Preis — nur teurer, weil daran Geld hängt.

**Markiert** mit `BUSINESS_DECISION_REQUIRED` an der Stelle, an der die
Zusage gemacht wird. Zwei Wege, und einer davon muss zuerst kommen:

1. Vorgang bauen (Fall, Frist, Zuständiger, Protokoll) — dann stimmt der Satz.
2. Den Satz auf das zurücknehmen, was es gibt: eine E-Mail-Adresse.

Was **nicht** geht: die Frist stehen lassen, ohne dass jemand sie zählt.

---

## 9 · Rechnung — fehlt vollständig

Volltextsuche `invoice` in `src/`: ein Treffer, im Stripe-Webhook (Stripes
eigene Abo-Rechnungen). Kein Beleg, kein PDF-Pfad, kein Nummernkreis, keine
Umsatzsteuer-Logik.

**Warum hier nichts gebaut wurde:** Eine Rechnung ist eine steuerliche
Aussage. Wer stellt sie — der Salon dem Mieter, oder ChairMatch als
Vermittler? Fällt Umsatzsteuer an, und wessen? Greift die
Kleinunternehmerregelung? Pflichtangaben nach § 14 UStG, fortlaufende
Nummernkreise, Aufbewahrungsfristen. Das sind Fragen an die
Steuerberatung, nicht an den Code.

Bis dahin ist die ehrliche Aussage: **es gibt keine Rechnungen.**

---

## 5 · Storno — die Lücke ist benannt, nicht geschlossen

`cancelBooking` erklärt im Code selbst, dass `snapshotPolicy` zwar
`cancellationHours` liefert, die Buchung aber keine Spalte hat, die eine
Stornogebühr aufnehmen könnte, und `booking_policies` nur
`no_show_fee_cents` führt — die Gebühr fürs Nichterscheinen, nicht fürs
Absagen.

Dort steht deshalb weder eine Vollerstattung noch ein einbehaltener Betrag:
beides wäre erfunden. Der Fall wird benannt und geht über
`/api/admin/refund`.

Dem gegenüber steht die öffentliche Zusage auf
`/mieter/wie-es-funktioniert`: „Bis 48h vorher kostenlos. Danach 50-100 % des
Tagespreises (steht im Listing)." **Im Listing steht das nicht** — es gibt
kein Feld dafür.

---

## Was als Nächstes sinnvoll ist

Nach Abhängigkeit, nicht nach Aufwand:

1. **Entscheiden, was „Schlichtung" heißen soll** (Stufe 8). Bis dahin
   sollte der Satz zurückgenommen werden — eine Frist, die niemand zählt,
   ist schlechter als keine Zusage.
2. **Stornogebühr-Feld** (Stufe 5) — braucht eine Migration *und* die
   Entscheidung, welche Staffel gilt. Die Zahl „50-100 %" steht heute nur im
   Marketingtext.
3. **Rechnung** (Stufe 9) — braucht Steuerberatung, nicht Code.
4. **Stripe** (Stufe 4) — DEFERRED, aber es ist die Voraussetzung dafür, dass
   3 und die Geldwirkung von 8 überhaupt Sinn ergeben.
