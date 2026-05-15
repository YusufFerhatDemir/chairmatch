/**
 * (public)-Layout — fügt den SeoFooter unter alle public SEO-Pages.
 *
 * Beeinflusste Routen:
 *   /was-ist-chairmatch, /provisionsmodell, /empfehlungen, /faq, /magazin,
 *   /freelancer-rechner, /premium, /haartransplantation, /zahnimplantate,
 *   /augenlasern, /longevity, /iv-infusionen, /anbieter/*, /mieter/*,
 *   /barbershop-deutschland, /friseur-deutschland, …,
 *   /[stadt], /[stadt]/[vertical], /listings/[slug], …
 *
 * NICHT beeinflusst (eigene Route-Groups):
 *   Home (/) — src/app/page.tsx
 *   /auth — src/app/(auth)/
 *   /admin — src/app/(admin)/
 *   /provider — src/app/(provider)/
 *
 * Hub-and-Spoke-Linking ist Top-3 SEO-Faktor für interne PageRank-Verteilung.
 */

import { SeoFooter } from "@/components/seo/SeoFooter"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SeoFooter />
    </>
  )
}
