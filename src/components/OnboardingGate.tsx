'use client'

/**
 * OnboardingGate — HART DEAKTIVIERT seit 2026-05-14.
 *
 * Der OnboardingGate wurde durch den neuen WelcomeSplitter ersetzt
 * (src/components/WelcomeSplitter.tsx). Diese Komponente reicht jetzt
 * nur noch children durch, ohne irgendetwas zu rendern.
 *
 * Der alte Code (Slides + RoleSelect + LoginFlow) liegt in
 * `OnboardingGate.legacy.txt` und kann bei Bedarf wiederhergestellt werden.
 *
 * Falls du den OnboardingGate-Flow zurück willst:
 * 1. In page.tsx: <WelcomeGate> durch <OnboardingGate slides={...}> ersetzen
 * 2. Inhalt aus OnboardingGate.legacy.txt zurück in diese Datei kopieren
 */

interface Slide {
  id: string
  title: string
  subtitle: string
  icon: string | null
  imageUrl: string | null
}

interface Props {
  slides?: Slide[]
  children: React.ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function OnboardingGate({ slides, children }: Props) {
  return <>{children}</>
}
