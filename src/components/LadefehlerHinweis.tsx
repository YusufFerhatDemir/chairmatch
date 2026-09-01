/**
 * Einheitlicher Hinweis fuer „Abfrage fehlgeschlagen" auf Listenseiten.
 *
 * Warum das eine eigene Komponente ist: ein Datenbankfehler sah auf fast jeder
 * oeffentlichen Liste genauso aus wie „es gibt hier nichts". Der Code las
 * `const { data } = await …` ohne `error` anzufassen — und PostgREST WIRFT
 * nicht, es liefert `{ data: null, error }` zurueck. Das umgebende
 * `try/catch` fing deshalb nur den Verbindungsabbruch, nie 42501, 42703 oder
 * einen Timeout. Uebrig blieb „Keine Angebote verfuegbar."
 *
 * Dieselbe Verwechslung von „kaputt" und „leer" hat in Track 6/7 schon die
 * Termine und die Anfragen unsichtbar gemacht; die Gegenprobe steht in
 * (protected)/favorites/page.tsx. „Leer" und „kaputt" muessen sich
 * unterscheiden lassen, sonst sucht niemand nach dem Fehler.
 */
export function LadefehlerHinweis({ text }: { text: string }) {
  return (
    <div role="alert" style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ color: 'var(--red)', fontSize: 'var(--font-md)' }}>{text}</p>
      <p style={{ color: 'var(--stone2)', fontSize: 'var(--font-sm)', marginTop: 4 }}>
        Das heißt nicht, dass die Liste leer ist — bitte später erneut versuchen.
      </p>
    </div>
  )
}
