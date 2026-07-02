// RECHTLICHER HINWEIS: Diese Widerrufsbelehrung folgt dem amtlichen Muster
// nach Anlage 1 zu Art. 246a § 1 Abs. 2 Satz 2 EGBGB.
// VOR LIVEGANG durch einen auf Verbraucherrecht spezialisierten Anwalt prüfen lassen.

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Widerrufsbelehrung',
  description: 'Widerrufsrecht und -belehrung für Verbraucher gemäß § 312g BGB i. V. m. § 355 BGB für Buchungen und Abonnements auf ChairMatch.',
  alternates: { canonical: 'https://www.chairmatch.de/widerruf' },
  robots: { index: true, follow: false },
}

export default function WiderrufPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 8 }}>
          Widerrufsbelehrung
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 24 }}>
          Stand: Mai 2026 · Version 1.0
        </p>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>

          {/* ── EINLEITUNG ── */}
          <div style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--cream)' }}>Schnellüberblick:</strong> Als Verbraucher kannst du
              Verträge mit ChairMatch (z. B. Premium-Abonnements oder gebuchte Leistungen) innerhalb von
              <strong style={{ color: 'var(--cream)' }}> 14 Tagen </strong> ohne Angabe von Gründen widerrufen.
              Wichtige Ausnahme: Bei Dienstleistungen, deren Ausführung du ausdrücklich für vor Ablauf
              der Widerrufsfrist gewünscht hast, erlischt das Widerrufsrecht mit der vollständigen Erbringung
              (z. B. ein bereits durchgeführter Salonbesuch).
            </p>
          </div>

          {/* ── 1. WIDERRUFSRECHT ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            1. Widerrufsrecht
          </h2>
          <p>
            Sie haben das Recht, binnen <strong style={{ color: 'var(--cream)' }}>vierzehn Tagen</strong> ohne
            Angabe von Gründen diesen Vertrag zu widerrufen.
          </p>
          <p style={{ marginTop: 8 }}>
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
          </p>
          <p style={{ marginTop: 8 }}>
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
          </p>
          <p style={{ marginLeft: 12, marginTop: 8 }}>
            Yusuf Ferhat Demir<br />
            Schillerstraße 31<br />
            60313 Frankfurt am Main<br />
            Deutschland<br />
            E-Mail: <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a>
          </p>
          <p style={{ marginTop: 8 }}>
            mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) über
            Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
            Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          </p>
          <p style={{ marginTop: 8 }}>
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
            Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </p>

          {/* ── 2. FOLGEN ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            2. Folgen des Widerrufs
          </h2>
          <p>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen
            erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich
            daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste
            Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
            zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen
            ist.
          </p>
          <p style={{ marginTop: 8 }}>
            Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen
            Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes
            vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
          </p>
          <p style={{ marginTop: 8 }}>
            Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist beginnen sollen, so
            haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu
            dem Sie uns von der Ausübung des Widerrufsrechts hinsichtlich dieses Vertrags unterrichten,
            bereits erbrachten Dienstleistungen im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen
            Dienstleistungen entspricht.
          </p>

          {/* ── 3. AUSSCHLUSS ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            3. Erlöschen des Widerrufsrechts bei Dienstleistungen
          </h2>
          <p>
            Das Widerrufsrecht erlischt bei einem Vertrag über Dienstleistungen auch dann, wenn der
            Unternehmer die Dienstleistung vollständig erbracht hat und mit der Ausführung der
            Dienstleistung erst begonnen hat, nachdem der Verbraucher dazu seine ausdrückliche Zustimmung
            gegeben hat und gleichzeitig seine Kenntnis davon bestätigt hat, dass er sein Widerrufsrecht
            bei vollständiger Vertragserfüllung durch den Unternehmer verliert (§ 356 Abs. 4 BGB).
          </p>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Konkret heißt das:</strong> Wenn du bei der Buchung
            ausdrücklich zustimmst (Checkbox „Ich möchte, dass die Ausführung der Dienstleistung sofort
            beginnt"), dein Termin innerhalb der 14-Tage-Frist liegt und du den Termin auch wahrnimmst,
            kannst du danach nicht mehr widerrufen.
          </p>

          {/* ── 4. KOSTENPFLICHTIGE LEISTUNGEN ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            4. Widerruf bei Abonnements (Premium / Gold)
          </h2>
          <p>
            Bei monatlich abrechenbaren Abonnements (Starter, Premium, Gold) kannst du innerhalb der ersten
            14 Tage seit Abschluss kostenlos widerrufen und erhältst eine vollständige Rückerstattung.
            Nach Ablauf der 14 Tage gelten die regulären Kündigungsfristen aus den AGB
            (monatliche Kündigung zum Ende der laufenden Abrechnungsperiode).
          </p>
          <p style={{ marginTop: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Kündigungsbutton nach § 312k BGB:</strong> In deinem
            Konto-Bereich findest du eine eindeutig beschriftete „Vertrag jetzt kündigen"-Schaltfläche.
            Die Kündigung wird auf Wunsch sofort wirksam, andernfalls zum nächstmöglichen Zeitpunkt.
          </p>

          {/* ── 5. MUSTER-WIDERRUFSFORMULAR ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            5. Muster-Widerrufsformular
          </h2>
          <p>
            (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden
            Sie es zurück.)
          </p>
          <div style={{
            background: 'rgba(20,18,15,0.6)',
            border: '1px solid rgba(212,175,55,0.18)',
            borderRadius: 12,
            padding: 16,
            marginTop: 12,
            fontFamily: 'monospace',
            fontSize: 'var(--font-sm)',
            color: 'var(--cream)',
            whiteSpace: 'pre-line',
          }}>
            {`An: Yusuf Ferhat Demir, Schillerstraße 31, 60313 Frankfurt am Main, Deutschland
E-Mail: legal@chairmatch.de

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über
den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):

___________________________________________________

Bestellt am (*) / erhalten am (*): _________________

Name des/der Verbraucher(s): _____________________

Anschrift des/der Verbraucher(s): ________________

___________________________________________________

Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): _______________

Datum: _____________

(*) Unzutreffendes streichen.`}
          </div>

          {/* ── 6. KONTAKT ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            6. Schneller Widerruf per E-Mail
          </h2>
          <p>
            Du kannst deinen Widerruf am einfachsten per E-Mail an{' '}
            <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>
              legal@chairmatch.de
            </a>{' '}
            schicken — mit dem Betreff „Widerruf" und Angabe deiner Buchungs- oder Vertragsnummer.
            Wir bestätigen den Eingang innerhalb von 24 Stunden.
          </p>

          {/* ── 7. STREITSCHLICHTUNG ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            7. Online-Streitbeilegung
          </h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--gold2)' }}
            >
              https://ec.europa.eu/consumers/odr
            </a>
            .<br />
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>

        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
