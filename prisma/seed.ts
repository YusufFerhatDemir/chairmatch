import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed app_settings
  const settings = [
    { category: 'theme', key: 'gold', value: '#C8A84B', label: 'Primär-Gold', sortOrder: 0 },
    { category: 'theme', key: 'gold2', value: '#E8D06A', label: 'Sekundär-Gold', sortOrder: 1 },
    { category: 'theme', key: 'gold3', value: '#F5E080', label: 'Tertiär-Gold', sortOrder: 2 },
    { category: 'theme', key: 'cream', value: '#F0E8D8', label: 'Text-Cream', sortOrder: 3 },
    { category: 'theme', key: 'stone', value: '#8A8070', label: 'Text-Stone', sortOrder: 4 },
    { category: 'theme', key: 'bg', value: '#060504', label: 'Hintergrund', sortOrder: 5 },
    { category: 'theme', key: 'red', value: '#E85040', label: 'Fehler-Rot', sortOrder: 6 },
    { category: 'theme', key: 'green', value: '#4A8A5A', label: 'Erfolg-Grün', sortOrder: 7 },
    { category: 'logo', key: 'main_url', value: '/icons/logo_lockup_512x384.png', label: 'Haupt-Logo', sortOrder: 0 },
    { category: 'logo', key: 'symbol_url', value: '/icons/logo_symbol_512x512.png', label: 'Symbol-Logo', sortOrder: 1 },
    { category: 'logo', key: 'panel_url', value: '/icons/logo_panel_lockup_512x384.png', label: 'Panel-Logo', sortOrder: 2 },
    { category: 'logo', key: 'appicon_url', value: '/icons/logo_panel_appicon_512x384.png', label: 'App-Icon', sortOrder: 3 },
    { category: 'layout', key: 'shell_max', value: '430', valueType: 'number', label: 'Max-Breite (px)', sortOrder: 0 },
    { category: 'layout', key: 'card_radius', value: '18', valueType: 'number', label: 'Card-Radius (px)', sortOrder: 1 },
    { category: 'layout', key: 'btn_radius', value: '14', valueType: 'number', label: 'Button-Radius (px)', sortOrder: 2 },
    { category: 'animation', key: 'logo_float', value: 'true', valueType: 'boolean', label: 'Logo-Float', sortOrder: 0 },
    { category: 'animation', key: 'logo_glow', value: 'true', valueType: 'boolean', label: 'Logo-Glow', sortOrder: 1 },
  ]

  for (const s of settings) {
    await prisma.appSetting.upsert({
      where: { category_key: { category: s.category, key: s.key } },
      update: { value: s.value, label: s.label, sortOrder: s.sortOrder },
      create: {
        category: s.category,
        key: s.key,
        value: s.value,
        valueType: s.valueType ?? 'string',
        label: s.label,
        sortOrder: s.sortOrder,
      },
    })
  }

  // Seed onboarding_slides
  const slides = [
    { title: 'Willkommen bei ChairMatch', subtitle: 'Dein Beauty-Partner in ganz Deutschland', icon: '💎', sortOrder: 0 },
    { title: 'Sofort buchen', subtitle: 'Termin in 30 Sekunden · Sofortige Bestätigung', icon: '📅', sortOrder: 1 },
    { title: 'Entdecken', subtitle: 'Friseure, Kosmetik, Massage & mehr in deiner Nähe', icon: '✨', sortOrder: 2 },
  ]

  for (const sl of slides) {
    const existing = await prisma.onboardingSlide.findFirst({
      where: { title: sl.title },
    })
    if (!existing) {
      await prisma.onboardingSlide.create({ data: sl })
    }
  }

  console.log('Seed complete: app_settings + onboarding_slides')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
