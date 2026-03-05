export const dynamic = 'force-dynamic'

import { getSettings } from '@/modules/super-admin/super-admin.actions'
import LogoManager from '@/components/super-admin/LogoManager'

export default async function LogoPage() {
  const allSettings = await getSettings('logo')

  const logos = allSettings.map(s => ({
    key: s.key,
    value: s.value,
    label: s.label,
  }))

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--cream)', fontWeight: 700, marginBottom: 16 }}>
        Logo-Verwaltung
      </h2>
      <LogoManager logos={logos} />
    </div>
  )
}
