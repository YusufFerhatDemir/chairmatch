export const dynamic = 'force-dynamic'

import { getSettings } from '@/modules/super-admin/super-admin.actions'
import SettingsForm from '@/components/super-admin/SettingsForm'

export default async function EinstellungenPage() {
  const allSettings = await getSettings()

  const themeSettings = allSettings.filter(s => s.category === 'theme')
  const layoutSettings = allSettings.filter(s => s.category === 'layout')
  const animationSettings = allSettings.filter(s => s.category === 'animation')

  return (
    <div>
      <h2 style={{ fontSize: 'var(--font-lg)', color: 'var(--cream)', fontWeight: 700, marginBottom: 16 }}>
        App-Einstellungen
      </h2>
      <SettingsForm
        themeSettings={themeSettings}
        layoutSettings={layoutSettings}
        animationSettings={animationSettings}
      />
    </div>
  )
}
