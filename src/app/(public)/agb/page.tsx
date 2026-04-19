// RECHTLICHER HINWEIS: Diese AGB sind ein technisches Gerüst.
// VOR LIVEGANG durch einen auf Verbraucher- und Plattformrecht spezialisierten Anwalt prüfen lassen.

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AGB — Allgemeine Geschäftsbedingungen',
  description: 'Allgemeine Geschäftsbedingungen von ChairMatch — Buchungen, Storno-Policy, Widerrufsbelehrung, Haftung.',
  robots: { index: true, follow: false },
}

export default function AGBPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 16 }}>Stand: April 2026 · ChairMatch — Dein Beauty-Partner in ganz Deutschland.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 1 Geltungsbereich</h2>
          <p>
            Diese AGB gelten für die Nutzung der Plattform ChairMatch (Webseite und App).
            Anbieter von Leistungen (Salons, Barbershops, Kosmetikstudios etc.) und Nutzer, die Termine buchen oder Räume/Stühle mieten,
            akzeptieren diese Bedingungen mit der Registrierung bzw. Nutzung.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 2 Leistungsbeschreibung (Marktplatz)</h2>
          <p>
            ChairMatch ist eine digitale Vermittlungsplattform für Beauty- und Wellness-Dienstleistungen sowie die Vermietung von
            Arbeitsstühlen, Liegen und Räumen. Wir vermitteln Verträge zwischen Kunden und Anbietern; der eigentliche Buchungs- oder
            Mietvertrag kommt zwischen Kunde und Anbieter zustande. ChairMatch ist nicht Partei dieses Vertrags und erbringt
            die Dienstleistung nicht selbst.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 3 Registrierung und Konto</h2>
          <p>
            Zur Nutzung bestimmter Funktionen ist eine Registrierung erforderlich. Sie stellen wahrheitsgemäße Angaben bereit
            und halten Ihre Zugangsdaten geheim. Ein Konto ist nicht übertragbar. Mindestalter: 18 Jahre.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 4 Buchungen und Vermietungen</h2>
          <p>
            Buchungen und Mietanfragen erfolgen über die Plattform. Bestätigung, Preise und Leistungsumfang legt der jeweilige
            Anbieter fest. Mit Absenden einer Buchung geben Sie ein verbindliches Angebot ab; die Buchung ist bestätigt,
            sobald der Anbieter oder die Plattform eine Bestätigung ausspricht oder der Status auf &quot;Bestätigt&quot; wechselt.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 4a Storno-Policy (Standardregelung)</h2>
          <p>
            Sofern der Anbieter keine abweichenden Bedingungen festlegt, gilt:<br />
            Kostenlose Stornierung bis <strong style={{ color: 'var(--cream)' }}>24 Stunden</strong> vor dem Termin.<br />
            Bei Stornierung weniger als 24 Stunden vorher: <strong style={{ color: 'var(--cream)' }}>50 % Gebühr</strong>.<br />
            Bei No-Show (Nichterscheinen): <strong style={{ color: 'var(--cream)' }}>100 %</strong> des Betrags.<br />
            Die geltende Storno-Policy wird im Buchungs-Flow vor Buchungsabschluss angezeigt.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 4b Widerrufsbelehrung (digitale Vermittlungsleistung)</h2>
          <p>
            <strong style={{ color: 'var(--cream)' }}>Widerrufsrecht:</strong> Als Verbraucher haben Sie das Recht, innerhalb von 14 Tagen ohne Angabe von Gründen
            von diesem Vertrag zurückzutreten. Die Frist beginnt mit Vertragsschluss.
          </p>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Ausnahme (§ 356 Abs. 5 BGB):</strong> Wenn Sie ausdrücklich zugestimmt haben, dass die Plattformleistung
            vor Ablauf der Widerrufsfrist beginnt (d. h. Buchung sofort wirksam wird), und zur Kenntnis genommen haben,
            dass das Widerrufsrecht damit erlischt, entfällt das Widerrufsrecht ab dem Moment der vollständigen Erbringung
            der Vermittlungsleistung.
          </p>
          <p style={{ marginTop: 8 }}>
            Für eine konkrete Buchung eines <strong style={{ color: 'var(--cream)' }}>Termins</strong> (z. B. Friseurbesuch) gilt: der Anbieter-Vertrag ist
            kein Fernabsatzgeschäft, da er Freizeitdienstleistungen zu einem bestimmten Termin betrifft (§ 312g Abs. 2 Nr. 9 BGB).
            Ein gesetzliches Widerrufsrecht besteht für diese Buchungen daher nicht.
          </p>
          <p style={{ marginTop: 8 }}>
            Widerrufsadresse: Yusuf Ferhat Demir, Schillerstraße 31, 60313 Frankfurt am Main,{' '}
            <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a>
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 5 Preise und Zahlung</h2>
          <p>
            Preise werden inkl. aller Abgaben in Euro ausgewiesen. Zahlungsabwicklung erfolgt über Stripe.
            ChairMatch kann für die Vermittlung Plattformgebühren erheben; diese werden vor Buchungsabschluss transparent ausgewiesen.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 6 Haftung</h2>
          <p>
            ChairMatch haftet nur für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit.
            Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit nicht wesentliche Vertragspflichten (Kardinalpflichten) verletzt werden.
            Für Schäden aus der Inanspruchnahme von Anbieterleistungen (Behandlung, Miete) ist der jeweilige Anbieter verantwortlich.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 7 Nutzungsregeln und Sperrung</h2>
          <p>
            Sie nutzen die Plattform ausschließlich rechtmäßig. Unzulässig sind: irreführende Angaben, Spam,
            missbräuchliche Bewertungen, Umgehung von Systemen, Scraping ohne Genehmigung.
            Wir können Konten bei Verstößen mit angemessener Vorankündigung (i. d. R. 30 Tage; sofort bei schwerem Missbrauch) sperren oder löschen.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 8 Kündigung</h2>
          <p>
            Sie können Ihr Konto jederzeit in den Einstellungen löschen. Das Konto wird nach einer 30-tägigen Übergangsfrist (Soft-Delete)
            dauerhaft entfernt. Gesetzliche Aufbewahrungsfristen bleiben unberührt.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 9 Bewertungen und Inhalte</h2>
          <p>
            Nutzer dürfen nur Bewertungen zu tatsächlich in Anspruch genommenen Leistungen abgeben. Gefälschte oder missbräuchliche
            Bewertungen sind untersagt. Wir behalten uns vor, Bewertungen zu moderieren oder zu entfernen, die gegen diese Regeln verstoßen.
            Mit dem Einstellen von Inhalten räumen Sie ChairMatch ein nicht-exklusives, übertragbares Nutzungsrecht zur Darstellung
            auf der Plattform ein.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 10 Schlussbestimmungen</h2>
          <p>
            Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
            Für Verbraucher ist Gerichtsstand der Wohnsitz des Verbrauchers; für Kaufleute und juristische Personen: Frankfurt am Main.
            Sollten einzelne Bestimmungen unwirksam sein, bleibt der Rest wirksam.
            Änderungen dieser AGB werden per E-Mail angekündigt; Widerspruch innerhalb von 6 Wochen möglich.
          </p>

          <p style={{ marginTop: 24 }}>
            <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutzerklärung</Link>
            {' · '}
            <Link href="/impressum" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Impressum</Link>
            {' · '}
            <Link href="/agb-provider" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB für Anbieter</Link>
          </p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
