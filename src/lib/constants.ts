import type { CategoryInfo, Notification, PromoCode } from './types'

export const CATEGORIES: CategoryInfo[] = [
  { id: 'barber', label: 'Barbershop', sub: 'Fade · Cut · Bart' },
  { id: 'friseur', label: 'Friseur', sub: 'Schnitt · Farbe · Styling' },
  { id: 'kosmetik', label: 'Kosmetik', sub: 'Facial · Peeling · Laser' },
  { id: 'aesthetik', label: 'Ästhetik', sub: 'Botox · Filler · Anti-Aging' },
  { id: 'nail', label: 'Nagelstudio', sub: 'Gel · Nail Art · Maniküre' },
  { id: 'massage', label: 'Massage', sub: 'Klassisch · Thai · Hot Stone' },
  { id: 'lash', label: 'Lash & Brows', sub: 'Extensions · Lifting' },
  { id: 'arzt', label: 'Arzt / Klinik', sub: 'Derma · Laser · Behandlung' },
  { id: 'opraum', label: 'OP-Raum', sub: 'Sterile Räume · Chirurgie' },
  { id: 'angebote', label: 'Angebote', sub: 'Rabatte · Specials' },
  { id: 'termin', label: 'Termin', sub: 'Buchen · Umbuchen' },
]

export const CATEGORY_ICONS: Record<string, string> = {
  barber: '/icons/01_barbershop_256x384.png',
  friseur: '/icons/02_friseur_256x384.png',
  kosmetik: '/icons/03_kosmetik_256x384.png',
  aesthetik: '/icons/04_aesthetik_256x384.png',
  nail: '/icons/05_nagelstudio_256x384.png',
  massage: '/icons/06_massage_256x384.png',
  lash: '/icons/07_lash_brows_256x384.png',
  arzt: '/icons/08_arzt_klinik_256x384.png',
  opraum: '/icons/09_op_raum_512x384.png',
  angebote: '/icons/10_angebote_256x384.png',
  termin: '/icons/11_termin_256x384.png',
}

export const RENTAL_ICONS: Record<string, string> = {
  stuhl: '/icons/12_stuhlvermietung_512x384.png',
  liege: '/icons/06_massage_256x384.png',
  raum: '/icons/03_kosmetik_256x384.png',
  opraum: '/icons/09_op_raum_512x384.png',
}

export const PROMO_CODES: Record<string, PromoCode> = {
  CHAIR2026: { code: 'CHAIR2026', discount: 15, type: 'percent' },
  WELCOME10: { code: 'WELCOME10', discount: 10, type: 'percent' },
  BEAUTY5: { code: 'BEAUTY5', discount: 5, type: 'fixed' },
}

export const DEFAULT_NOTIFICATIONS: Notification[] = [
  { id: 'n1', title: 'Termin morgen!', body: 'Skin Fade bei BlackLabel · Mi 10:00', time: 'vor 2 Std.', read: false, icon: '📅' },
  { id: 'n2', title: '15% Rabatt', body: 'Exklusiv für dich bei King\'s Cut Berlin', time: 'vor 5 Std.', read: false, icon: '🎉' },
  { id: 'n3', title: 'Neue Bewertung', body: 'Tobias K. hat BlackLabel bewertet', time: 'Gestern', read: true, icon: '⭐' },
  { id: 'n4', title: 'Willkommen!', body: 'Entdecke die besten Salons in deiner Nähe', time: 'vor 2 Tagen', read: true, icon: '👋' },
]

export const SVC_CATALOG: Record<string, { nm: string; dur: number; pr: number }[]> = {
  barber: [
    { nm: 'Herrenschnitt', dur: 30, pr: 28 }, { nm: 'Trockenschnitt', dur: 25, pr: 22 },
    { nm: 'Skin Fade', dur: 40, pr: 35 }, { nm: 'Beard Trim', dur: 20, pr: 15 },
    { nm: 'Bart Design', dur: 30, pr: 25 }, { nm: 'Hot Towel Shave', dur: 30, pr: 28 },
    { nm: 'Full Service (Cut + Bart)', dur: 60, pr: 50 }, { nm: 'Kinderschnitt', dur: 20, pr: 18 },
    { nm: 'Kopfmassage', dur: 15, pr: 12 }, { nm: 'Augenbrauen', dur: 10, pr: 8 },
    { nm: 'Nasenhaare Waxing', dur: 5, pr: 5 },
  ],
  friseur: [
    { nm: 'Damenschnitt', dur: 45, pr: 45 }, { nm: 'Herrenschnitt', dur: 30, pr: 32 },
    { nm: 'Waschen & Föhnen', dur: 30, pr: 25 }, { nm: 'Balayage / Highlights', dur: 120, pr: 120 },
    { nm: 'Komplett-Coloration', dur: 90, pr: 85 }, { nm: 'Strähnchen', dur: 90, pr: 95 },
    { nm: 'Haarverlängerung', dur: 180, pr: 250 }, { nm: 'Brautfrisur', dur: 90, pr: 120 },
    { nm: 'Kinderschnitt', dur: 20, pr: 18 }, { nm: 'Kopfhaut-Treatment', dur: 30, pr: 35 },
  ],
  kosmetik: [
    { nm: 'Klassisches Facial', dur: 60, pr: 75 }, { nm: 'Anti-Aging Behandlung', dur: 75, pr: 120 },
    { nm: 'Chemical Peeling', dur: 45, pr: 65 }, { nm: 'Microdermabrasion', dur: 45, pr: 80 },
    { nm: 'Hautreinigung', dur: 60, pr: 55 }, { nm: 'Augenbrauen Waxing', dur: 15, pr: 12 },
    { nm: 'Wimpern Lifting', dur: 60, pr: 55 }, { nm: 'Rückenbehandlung', dur: 50, pr: 70 },
    { nm: 'Fruchtsäurepeeling', dur: 40, pr: 60 }, { nm: 'Ultraschall-Behandlung', dur: 45, pr: 85 },
  ],
  aesthetik: [
    { nm: 'Botox', dur: 30, pr: 280 }, { nm: 'Hyaluron Filler', dur: 45, pr: 380 },
    { nm: 'Lippen Unterspritzung', dur: 30, pr: 350 }, { nm: 'Profhilo', dur: 45, pr: 420 },
    { nm: 'Mesotherapie', dur: 45, pr: 200 }, { nm: 'PRP Behandlung', dur: 60, pr: 350 },
    { nm: 'Faltenunterspritzung', dur: 30, pr: 300 }, { nm: 'Haartransplantation Beratung', dur: 60, pr: 0 },
  ],
  nail: [
    { nm: 'Gel Maniküre', dur: 60, pr: 45 }, { nm: 'Shellac', dur: 45, pr: 35 },
    { nm: 'Nail Art Design', dur: 90, pr: 75 }, { nm: 'Acryl Verlängerung', dur: 90, pr: 65 },
    { nm: 'French Nails', dur: 60, pr: 50 }, { nm: 'Pediküre', dur: 50, pr: 40 },
    { nm: 'Chrome Nails', dur: 75, pr: 60 }, { nm: 'Nail Repair', dur: 30, pr: 20 },
  ],
  massage: [
    { nm: 'Klassische Massage', dur: 60, pr: 65 }, { nm: 'Tiefengewebsmassage', dur: 60, pr: 80 },
    { nm: 'Hot Stone Massage', dur: 90, pr: 100 }, { nm: 'Thai Massage', dur: 60, pr: 70 },
    { nm: 'Sportmassage', dur: 45, pr: 60 }, { nm: 'Lymphdrainage', dur: 60, pr: 75 },
    { nm: 'Fußreflexzonen', dur: 30, pr: 40 }, { nm: 'Aromatherapie', dur: 75, pr: 85 },
    { nm: 'Shiatsu', dur: 60, pr: 75 },
  ],
  lash: [
    { nm: 'Classic Lash Extensions', dur: 90, pr: 85 }, { nm: 'Volume Lash Extensions', dur: 120, pr: 120 },
    { nm: 'Lash Lifting & Tinting', dur: 60, pr: 55 }, { nm: 'Wimpern Auffüllen', dur: 60, pr: 50 },
    { nm: 'Brow Lamination', dur: 45, pr: 45 }, { nm: 'Brow Shaping', dur: 30, pr: 25 },
    { nm: 'Lash Removal', dur: 30, pr: 25 },
  ],
  arzt: [
    { nm: 'Hautkrebs-Screening', dur: 30, pr: 95 }, { nm: 'Laser Haarentfernung', dur: 45, pr: 150 },
    { nm: 'Akne Behandlung', dur: 40, pr: 120 }, { nm: 'Derma-Beratung', dur: 30, pr: 80 },
    { nm: 'Narbenbehandlung', dur: 60, pr: 200 }, { nm: 'Pigmentflecken Laser', dur: 45, pr: 180 },
    { nm: 'Haartransplantation', dur: 180, pr: 2500 },
  ],
  raum: [],
  opraum: [
    { nm: 'OP-Raum Tagesmiete', dur: 480, pr: 450 }, { nm: 'OP-Raum Halbtag', dur: 240, pr: 280 },
    { nm: 'Sterilisation & Aufbereitung', dur: 60, pr: 80 },
  ],
}

export const EQUIP_CATALOG: Record<string, { nm: string; pr: number; icon: string }[]> = {
  barber: [
    { nm: 'Profi-Trimmer Set', pr: 5, icon: '✂️' }, { nm: 'Rasiermesser-Set', pr: 3, icon: '🪒' },
    { nm: 'Hot-Towel Dampfgerät', pr: 8, icon: '♨️' }, { nm: 'Barber-Werkzeugkoffer', pr: 10, icon: '🧰' },
    { nm: 'Haarwaschbecken', pr: 0, icon: '🚿' }, { nm: 'Sterilisator (UV)', pr: 5, icon: '🔬' },
  ],
  friseur: [
    { nm: 'Föhn & Rundbürsten-Set', pr: 5, icon: '💨' }, { nm: 'Glätteisen / Lockenstab', pr: 5, icon: '🔥' },
    { nm: 'Färbe-Arbeitsplatz', pr: 8, icon: '🎨' }, { nm: 'Haarwaschbecken', pr: 0, icon: '🚿' },
    { nm: 'Trockenhaube', pr: 5, icon: '💇' }, { nm: 'Sterilisator (UV)', pr: 3, icon: '🔬' },
  ],
  kosmetik: [
    { nm: 'Laser-Haarentfernung', pr: 25, icon: '⚡' }, { nm: 'Microneedling-Gerät', pr: 15, icon: '💉' },
    { nm: 'Microblading-Set', pr: 12, icon: '✏️' }, { nm: 'Ultraschall-Gerät', pr: 10, icon: '📡' },
    { nm: 'Hochfrequenz-Gerät', pr: 10, icon: '🔌' }, { nm: 'Dampfgerät (Vapozon)', pr: 5, icon: '♨️' },
    { nm: 'LED-Lichttherapie', pr: 8, icon: '💡' }, { nm: 'Derma-Roller Set', pr: 5, icon: '🔄' },
  ],
  aesthetik: [
    { nm: 'Botox-Injektionsset', pr: 0, icon: '💉' }, { nm: 'Filler-Kanülen Set', pr: 0, icon: '💉' },
    { nm: 'Laser-Gerät', pr: 30, icon: '⚡' }, { nm: 'Kühlgerät (Kryolipolyse)', pr: 20, icon: '❄️' },
    { nm: 'Ultraschall (HIFU)', pr: 25, icon: '📡' }, { nm: 'Mesotherapie-Gerät', pr: 15, icon: '🔬' },
  ],
  nail: [
    { nm: 'UV/LED Lampe', pr: 3, icon: '💡' }, { nm: 'Fräser (E-Feile)', pr: 5, icon: '🔧' },
    { nm: 'Airbrush-Set', pr: 8, icon: '🎨' }, { nm: 'Gel & Acryl Sortiment', pr: 5, icon: '💅' },
    { nm: 'Absaugung', pr: 3, icon: '💨' },
  ],
  massage: [
    { nm: 'Hot-Stone Set', pr: 8, icon: '🪨' }, { nm: 'Schröpfgläser', pr: 5, icon: '⭕' },
    { nm: 'Massageöle Sortiment', pr: 3, icon: '🧴' }, { nm: 'Infrarot-Lampe', pr: 5, icon: '🔴' },
    { nm: 'TENS-Gerät', pr: 5, icon: '⚡' },
  ],
  lash: [
    { nm: 'Wimpern-Extensions Set', pr: 10, icon: '👁️' }, { nm: 'Lash-Lifting Kit', pr: 8, icon: '✨' },
    { nm: 'Brow-Lamination Kit', pr: 8, icon: '✏️' }, { nm: 'Ringlampe', pr: 3, icon: '💡' },
    { nm: 'Lupe mit Licht', pr: 3, icon: '🔍' },
  ],
  arzt: [
    { nm: 'Dermatoskop', pr: 10, icon: '🔬' }, { nm: 'Laser-Gerät (med.)', pr: 40, icon: '⚡' },
    { nm: 'EKG-Monitor', pr: 15, icon: '💓' }, { nm: 'Ultraschall (Sono)', pr: 20, icon: '📡' },
    { nm: 'Kryotherapie-Gerät', pr: 15, icon: '❄️' }, { nm: 'Blutdruckmessgerät', pr: 0, icon: '🩺' },
  ],
  raum: [],
  opraum: [
    { nm: 'OP-Tisch (elektrisch)', pr: 0, icon: '🛏️' }, { nm: 'OP-Leuchte', pr: 0, icon: '💡' },
    { nm: 'Anästhesie-Gerät', pr: 30, icon: '😷' }, { nm: 'Monitor & Vitaldaten', pr: 15, icon: '💓' },
    { nm: 'Absaugung (chirurg.)', pr: 10, icon: '🔧' }, { nm: 'Sterilisator (Autoklav)', pr: 10, icon: '🔬' },
    { nm: 'Instrumenten-Set', pr: 20, icon: '🩺' },
  ],
}

// ═══ Marketplace Constants ═══

export const PRODUCT_CATEGORIES_B2C = [
  { slug: 'haarpflege', name: 'Haarpflege', icon: '💇' },
  { slug: 'styling', name: 'Styling', icon: '💫' },
  { slug: 'hautpflege', name: 'Hautpflege', icon: '🧴' },
  { slug: 'nagelpflege', name: 'Nagelpflege', icon: '💅' },
  { slug: 'bartpflege', name: 'Bartpflege', icon: '🧔' },
  { slug: 'kosmetik-produkte', name: 'Kosmetik', icon: '💄' },
] as const

export const PRODUCT_CATEGORIES_B2B = [
  { slug: 'profi-haarpflege', name: 'Profi-Haarpflege (Liter)', icon: '🧴' },
  { slug: 'chemie', name: 'Chemie (Farbe, Blondierung)', icon: '🧪' },
  { slug: 'werkzeug', name: 'Werkzeug (Scheren, Clipper)', icon: '✂️' },
  { slug: 'einwegmaterial', name: 'Einwegmaterial', icon: '🧤' },
  { slug: 'hygiene', name: 'Hygiene & Desinfektion', icon: '🧹' },
  { slug: 'moebel-ausstattung', name: 'Möbel & Ausstattung', icon: '🪑' },
  { slug: 'technik', name: 'Technik & Geräte', icon: '🔌' },
] as const

export const COMMISSION_DEFAULTS = {
  rental: { min: 12, max: 15, default: 12 },
  new_customer: { min: 15, max: 15, default: 15 },
  product_recommendation_salon: { min: 5, max: 10, default: 7.5 },
  product_recommendation_platform: { min: 3, max: 7, default: 5 },
  product_sale_platform: { min: 8, max: 15, default: 10 },
} as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Ausstehend',
  confirmed: 'Bestätigt',
  processing: 'In Bearbeitung',
  shipped: 'Versendet',
  delivered: 'Geliefert',
  cancelled: 'Storniert',
  refunded: 'Erstattet',
}
