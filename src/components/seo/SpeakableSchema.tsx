import { speakableSchema } from '@/lib/seo'

/**
 * SpeakableSchema — WebPage-Node mit SpeakableSpecification (GEO).
 *
 * Voice-Assistants und AI-Crawler (Google Assistant, ChatGPT, Claude,
 * Perplexity) lesen die per CSS-Selektor markierten Abschnitte als
 * "vorlesbare" Kurzantwort der Seite.
 *
 * Verwendung (Server- ODER Client-Komponente, rendert nur ein Script-Tag):
 *   <SpeakableSchema path="/koeln" name="Stuhlmiete Köln" description="…" />
 *
 * WICHTIG: Die Seite muss die Selektor-Klassen im Markup tragen —
 * `.speakable-headline` auf dem H1 und `.speakable-summary` auf dem
 * Intro-/Zusammenfassungs-Absatz (2-3 kurze Abschnitte, keine ganzen
 * Artikel — Google-Guideline).
 */
export function SpeakableSchema({
  path,
  name,
  description,
}: {
  /** Pfad ("/koeln") oder absolute URL der Seite */
  path: string
  name: string
  description?: string
}) {
  const url = path.startsWith('http') ? path : `https://www.chairmatch.de${path}`
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema(url, name, description)) }}
    />
  )
}
