import { MetadataRoute } from 'next'

/**
 * Robots-Strategie für ChairMatch.
 *
 * Erlaubt für alle Crawler: Marketing-Routen.
 * Blockiert: API, Account, Admin, sensitive Auth-URLs, Filter-URLs.
 *
 * AI-Crawler (GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot,
 * Google-Extended) sind explizit zugelassen — wir wollen in
 * AI-Antworten zitiert werden.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/account/',
          '/admin/',
          '/provider/',
          '/owner/',
          '/investor/',
          '/booking/',
          '/auth/reset-password',
          '/auth/change-password',
          // Interne App-Bereiche (noindex-Layouts vorhanden, hier zusätzlich Crawl sparen)
          '/nachrichten/',
          '/konto',
          '/termine',
          '/inserat/',
          '/anbieter/mein-salon',
          '/anbieter/onboarding',
          '/mieter/mein-bereich',
          '/mieter/onboarding',
          '/vermieter/mein-inserat',
          '/vermieter/onboarding',
          '/test-i18n-check',
          // Filter-/Such-URLs: Faceted-Search-Falle vermeiden
          '/search?',
          '/explore?',
          // Next.js interne RSC-Parameter
          '/*?_rsc=*',
          '/*?_next=*',
        ],
      },
      // AI-Crawler explizit zulassen
      { userAgent: 'GPTBot', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'PerplexityBot', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'ClaudeBot', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'Claude-Web', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'Google-Extended', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'CCBot', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
      { userAgent: 'anthropic-ai', allow: '/', disallow: ['/api/', '/account/', '/admin/'] },
    ],
    sitemap: 'https://www.chairmatch.de/sitemap.xml',
    host: 'https://www.chairmatch.de',
  }
}
