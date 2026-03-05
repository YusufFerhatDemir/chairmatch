export const dynamic = 'force-dynamic'

import { getSlides } from '@/modules/super-admin/super-admin.actions'
import OnboardingEditor from '@/components/super-admin/OnboardingEditor'

export default async function OnboardingPage() {
  const slides = await getSlides()

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--cream)', fontWeight: 700, marginBottom: 16 }}>
        Onboarding Slides
      </h2>
      <OnboardingEditor initialSlides={slides} />
    </div>
  )
}
