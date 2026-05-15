import { SeoFooter } from "@/components/seo/SeoFooter"

/**
 * (public)-Layout — fügt den SeoFooter unter alle public SEO-Pages.
 * Home (/) und /auth sind in eigenen Route-Groups → unangetastet.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SeoFooter />
    </>
  )
}
