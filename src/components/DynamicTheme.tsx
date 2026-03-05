import { getCachedSettings } from '@/lib/settings'

export default async function DynamicTheme() {
  const [themeSettings, layoutSettings, animationSettings] = await Promise.all([
    getCachedSettings('theme'),
    getCachedSettings('layout'),
    getCachedSettings('animation'),
  ])

  const vars: string[] = []

  for (const s of themeSettings) {
    vars.push(`--${s.key}: ${s.value}`)
  }

  for (const s of layoutSettings) {
    if (s.key === 'shell_max') vars.push(`--shell-max: ${s.value}px`)
    else if (s.key === 'card_radius') vars.push(`--card-radius: ${s.value}px`)
    else if (s.key === 'btn_radius') vars.push(`--btn-radius: ${s.value}px`)
  }

  if (vars.length === 0) return null

  const logoFloat = animationSettings.find(s => s.key === 'logo_float')?.value !== 'false'
  const logoGlow = animationSettings.find(s => s.key === 'logo_glow')?.value !== 'false'

  const animOverrides: string[] = []
  if (!logoFloat) animOverrides.push('@keyframes logoFloat { 0%, 50%, 100% { transform: translateY(0) } }')
  if (!logoGlow) animOverrides.push('@keyframes logoGlow { 0%, 50%, 100% { filter: none } }')

  const css = `:root { ${vars.join('; ')} } ${animOverrides.join(' ')}`

  return (
    <style dangerouslySetInnerHTML={{ __html: css }} />
  )
}
