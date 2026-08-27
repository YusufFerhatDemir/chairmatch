/**
 * JSON-LD-Einbettung.
 *
 * Die Schema-Bloecke landen als Inline-`<script>` im HTML und enthalten
 * Nutzerdaten: Produktnamen und -beschreibungen aus dem Verkaeuferkonto,
 * Salonnamen, Inseratstexte. `JSON.stringify()` escapet `<` und `>` nicht —
 * ein `</script>` im Produktnamen beendet damit das Script-Element, und der
 * Rest wird als Markup geparst. Mit `script-src 'unsafe-inline'` in der CSP
 * ist das ausfuehrbar.
 */
import { describe, it, expect } from 'vitest'
import { jsonLd } from '../seo'

describe('jsonLd', () => {
  it('laesst kein rohes < oder > durch', () => {
    const out = jsonLd({ name: '<b>Shampoo</b>' })
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).toContain('\\u003c')
  })

  it('bricht nicht aus dem Script-Element aus', () => {
    const boese = '</script><script>alert(1)</script>'
    const out = jsonLd({ '@type': 'Product', name: boese })
    expect(out.toLowerCase()).not.toContain('</script')
    expect(out.toLowerCase()).not.toContain('<script')
  })

  it('escapet auch tief verschachtelte Felder und Schluesselnamen', () => {
    const out = jsonLd({
      offers: { seller: { name: '</script>Firma' } },
      '<key>': 'wert',
      liste: ['</script>', 'ok'],
    })
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
  })

  it('escapet die Zeilentrenner U+2028 und U+2029', () => {
    const out = jsonLd({ name: 'a\u2028b\u2029c' })
    expect(out).not.toContain('\u2028')
    expect(out).not.toContain('\u2029')
    expect(out).toContain('\\u2028')
    expect(out).toContain('\\u2029')
  })

  it('bleibt gueltiges JSON mit unveraendertem Inhalt', () => {
    // Entscheidend: Suchmaschinen duerfen nichts anderes lesen als vorher.
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Föhn <Profi> & "Co."',
      description: 'Zeile1\nZeile2 — 20 % Ersparnis',
      offers: { price: '49.00', priceCurrency: 'EUR' },
      tags: ['a', 'b'],
      nichts: null,
    }
    expect(JSON.parse(jsonLd(schema))).toEqual(schema)
  })

  it('gibt fuer einfache Werte dasselbe wie JSON.stringify aus, nur escaped', () => {
    expect(jsonLd({ a: 1, b: true, c: 'text' })).toBe('{"a":1,"b":true,"c":"text"}')
  })

  it('escapet & mit, damit auch HTML-Entities keine Rolle spielen', () => {
    expect(jsonLd({ name: 'Schere & Kamm' })).toContain('\\u0026')
  })
})
