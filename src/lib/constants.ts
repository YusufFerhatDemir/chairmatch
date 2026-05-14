import type { CategoryInfo, Notification, PromoCode } from './types'

export const CATEGORIES: CategoryInfo[] = [
  // Beauty (Standard)
  { id: 'barber', label: 'Barbershop', sub: 'Fade · Cut · Bart' },
  { id: 'friseur', label: 'Friseur', sub: 'Schnitt · Farbe · Styling' },
  { id: 'kosmetik', label: 'Kosmetik', sub: 'Facial · Peeling · Laser' },
  { id: 'nail', label: 'Nagelstudio', sub: 'Gel · Nail Art · Maniküre' },
  { id: 'massage', label: 'Massage', sub: 'Klassisch · Thai · Hot Stone' },
  { id: 'lash', label: 'Lash & Brows', sub: 'Extensions · Lifting' },
  // Medical Beauty (Premium)
  { id: 'aesthetik', label: 'Ästhetik', sub: 'Botox · Filler · Anti-Aging' },
  { id: 'haartransplantation', label: 'Haartransplantation', sub: 'FUE · DHI · Saphir · Eigenhaar' },
  { id: 'zahnimplantate', label: 'Zahnimplantate', sub: 'Implantate · Veneers · All-on-4' },
  { id: 'augenlasern', label: 'Augenlasern', sub: 'LASIK · Femto · ReLEx Smile' },
  { id: 'longevity', label: 'Longevity-Center', sub: 'Cryo · Sauerstoff · HIFU · Anti-Aging' },
  { id: 'infusion', label: 'IV-Infusionen', sub: 'NAD+ · Vitamin-Drip · Detox' },
  // Medical
  { id: 'arzt', label: 'Arzt / Klinik', sub: 'Derma · Laser · Behandlung' },
  { id: 'opraum', label: 'OP-Raum', sub: 'Sterile Räume · Chirurgie' },
  // System
  { id: 'angebote', label: 'Angebote', sub: 'Rabatte · Specials' },
  { id: 'termin', label: 'Termin', sub: 'Buchen · Umbuchen' },
]

export const CATEGORY_ICONS: Record<string, string> = {
  barber: '/icons/01_barbershop_256x384.png',
  friseur: '/icons/02_friseur_256x384.png',
  kosmetik: '/icons/03_kosmetik_256x384.png',
  aesthetik: '/icons/04_aesthetik_256x384.png',
  haartransplantation: '/icons/08_arzt_klinik_256x384.png', // Fallback
  zahnimplantate: '/icons/08_arzt_klinik_256x384.png',       // Fallback
  augenlasern: '/icons/08_arzt_klinik_256x384.png',          // Fallback
  longevity: '/icons/04_aesthetik_256x384.png',              // Fallback
  infusion: '/icons/08_arzt_klinik_256x384.png',             // Fallback
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
    // Facials & Peelings
    { nm: 'Klassisches Facial', dur: 60, pr: 75 }, { nm: 'Anti-Aging Behandlung', dur: 75, pr: 120 },
    { nm: 'Aquafacial / HydraFacial', dur: 60, pr: 90 }, { nm: 'Chemical Peeling', dur: 45, pr: 65 },
    { nm: 'Fruchtsäurepeeling', dur: 40, pr: 60 }, { nm: 'Microdermabrasion', dur: 45, pr: 80 },
    { nm: 'Hautreinigung', dur: 60, pr: 55 }, { nm: 'Ultraschall-Behandlung', dur: 45, pr: 85 },
    // Mikronadel & Anti-Aging (Elif-Wünsche)
    { nm: 'Microneedling', dur: 60, pr: 120 }, { nm: 'Lachs-DNA-Behandlung (PDRN)', dur: 45, pr: 250 },
    // Augenbrauen & Wimpern
    { nm: 'Browlift / Brow Lamination', dur: 45, pr: 65 },
    { nm: 'Fadentechnik (Threading) Augenbrauen', dur: 15, pr: 18 },
    { nm: 'Augenbrauen + Wimpern färben', dur: 25, pr: 25 },
    { nm: 'Augenbrauen Waxing', dur: 15, pr: 12 },
    { nm: 'Wimpern Lifting', dur: 60, pr: 55 },
    { nm: 'Wimpernverlängerung (Classic)', dur: 90, pr: 95 },
    { nm: 'Wimpernverlängerung (Volume)', dur: 120, pr: 130 },
    // Waxing
    { nm: 'Brazilian Wax', dur: 30, pr: 35 }, { nm: 'Ganzkörper Wax', dur: 90, pr: 95 },
    { nm: 'Beine Wax (komplett)', dur: 45, pr: 45 }, { nm: 'Oberlippe / Kinn Wax', dur: 10, pr: 10 },
    // Körper
    { nm: 'Rückenbehandlung', dur: 50, pr: 70 },
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
  ],
  haartransplantation: [
    { nm: 'Beratungsgespräch (kostenlos)', dur: 30, pr: 0 },
    { nm: 'Haaranalyse + Wachstumsprognose', dur: 45, pr: 0 },
    { nm: 'FUE-Methode bis 2000 Grafts', dur: 360, pr: 2490 },
    { nm: 'FUE-Methode 2000-4000 Grafts', dur: 480, pr: 3490 },
    { nm: 'FUE-Methode 4000-6000 Grafts (Mega-Session)', dur: 600, pr: 4990 },
    { nm: 'DHI-Methode (Choi-Pen) bis 2500 Grafts', dur: 420, pr: 3290 },
    { nm: 'DHI-Methode 2500-5000 Grafts', dur: 540, pr: 4590 },
    { nm: 'Saphir-FUE bis 3000 Grafts (Premium)', dur: 480, pr: 4290 },
    { nm: 'Frauen-Haartransplantation', dur: 480, pr: 4990 },
    { nm: 'Bart-Transplantation (kompletter Bart)', dur: 360, pr: 2890 },
    { nm: 'Bart-Transplantation (Dichteoptimierung)', dur: 240, pr: 1890 },
    { nm: 'Augenbrauen-Transplantation', dur: 180, pr: 1690 },
    { nm: 'Schläfen-Auffüllung', dur: 240, pr: 1990 },
    { nm: 'Narben-Transplantation', dur: 240, pr: 1990 },
    { nm: 'PRP-Behandlung (Eigenblut-Therapie)', dur: 60, pr: 290 },
    { nm: 'PRP-Behandlung 3er-Paket', dur: 60, pr: 690 },
    { nm: 'Nachsorge-Termin', dur: 30, pr: 0 },
    { nm: '12-Monats-Follow-Up + Foto-Dokumentation', dur: 30, pr: 0 },
  ],
  zahnimplantate: [
    { nm: 'Erstberatung + 3D-Röntgen', dur: 45, pr: 0 },
    { nm: 'Einzelimplantat (Standard)', dur: 90, pr: 1490 },
    { nm: 'Einzelimplantat Premium (Straumann/Nobel)', dur: 90, pr: 2290 },
    { nm: 'Implantatkrone Vollkeramik', dur: 60, pr: 890 },
    { nm: 'All-on-4 (komplett feste Brücke)', dur: 240, pr: 11900 },
    { nm: 'All-on-6 (Premium)', dur: 300, pr: 14900 },
    { nm: 'Sofortimplantat', dur: 120, pr: 1990 },
    { nm: 'Knochenaufbau (klein)', dur: 60, pr: 590 },
    { nm: 'Knochenaufbau (Sinuslift)', dur: 90, pr: 1290 },
    { nm: 'Veneers (Vollkeramik)', dur: 90, pr: 690 },
    { nm: 'Veneers (No-Prep)', dur: 60, pr: 590 },
    { nm: 'Professionelle Zahnreinigung', dur: 60, pr: 99 },
    { nm: 'Bleaching (Praxis-Power-Bleaching)', dur: 90, pr: 390 },
    { nm: 'Invisalign-Beratung + Scan', dur: 45, pr: 0 },
    { nm: 'Invisalign Light (bis 14 Aligner)', dur: 0, pr: 2490 },
    { nm: 'Invisalign Comprehensive (komplette Behandlung)', dur: 0, pr: 5990 },
    { nm: 'Nachsorge-Termin', dur: 30, pr: 0 },
  ],
  augenlasern: [
    { nm: 'Voruntersuchung + Eignungs-Check', dur: 90, pr: 0 },
    { nm: 'LASIK (pro Auge)', dur: 30, pr: 1490 },
    { nm: 'LASIK (beide Augen)', dur: 60, pr: 2490 },
    { nm: 'Femto-LASIK (pro Auge)', dur: 30, pr: 1890 },
    { nm: 'Femto-LASIK (beide Augen)', dur: 60, pr: 2990 },
    { nm: 'ReLEx Smile (pro Auge) — Premium', dur: 30, pr: 2290 },
    { nm: 'ReLEx Smile (beide Augen) — Premium', dur: 60, pr: 3990 },
    { nm: 'Trans-PRK (oberflächliche Methode)', dur: 30, pr: 1490 },
    { nm: 'ICL (Linsenimplantat, pro Auge)', dur: 45, pr: 2990 },
    { nm: 'ICL (beide Augen)', dur: 90, pr: 5490 },
    { nm: 'Refraktiver Linsenaustausch (RLA, pro Auge)', dur: 45, pr: 2890 },
    { nm: 'Refraktiver Linsenaustausch (beide Augen)', dur: 90, pr: 4990 },
    { nm: 'Nachuntersuchung 1 Tag', dur: 15, pr: 0 },
    { nm: 'Nachuntersuchung 1 Woche', dur: 30, pr: 0 },
    { nm: '12-Monats-Garantie-Kontrolle', dur: 30, pr: 0 },
  ],
  longevity: [
    { nm: 'Longevity-Assessment (Erstanamnese + Bluttest)', dur: 90, pr: 290 },
    { nm: 'Hyperbare Sauerstofftherapie (HBOT) — Einzelsitzung', dur: 90, pr: 149 },
    { nm: 'HBOT 10er-Paket', dur: 90, pr: 1290 },
    { nm: 'Ganzkörper-Kryotherapie (-110°C) — Einzelsitzung', dur: 10, pr: 39 },
    { nm: 'Ganzkörper-Kryotherapie 10er-Paket', dur: 10, pr: 290 },
    { nm: 'Lokale Kryotherapie (Knie/Schulter etc.)', dur: 15, pr: 29 },
    { nm: 'Rotlicht-Therapie (Photobiomodulation)', dur: 30, pr: 49 },
    { nm: 'EMS-Ganzkörper-Training (20 Min)', dur: 25, pr: 39 },
    { nm: 'HIFU-Hautstraffung Gesicht', dur: 90, pr: 690 },
    { nm: 'HIFU-Hautstraffung Hals/Décolleté', dur: 60, pr: 490 },
    { nm: 'CoolSculpting Body-Contouring (1 Zone)', dur: 60, pr: 390 },
    { nm: 'CoolSculpting (2 Zonen)', dur: 120, pr: 690 },
    { nm: 'Ozontherapie (große Eigenblut)', dur: 30, pr: 79 },
    { nm: 'Stresstest + HRV-Messung', dur: 45, pr: 89 },
    { nm: 'Epigenetisches Altersanalyse (DNA-Methylierung)', dur: 30, pr: 290 },
    { nm: 'Personalisierte Longevity-Strategie (3 Monate Coaching)', dur: 0, pr: 1490 },
  ],
  infusion: [
    { nm: 'Beratungsgespräch (kostenlos)', dur: 20, pr: 0 },
    { nm: 'Basis Vitamin-C-Infusion (7,5g)', dur: 45, pr: 79 },
    { nm: 'Hochdosis Vitamin-C (25g)', dur: 60, pr: 149 },
    { nm: 'Energy-Boost (B-Komplex + Mg + Aminosäuren)', dur: 60, pr: 119 },
    { nm: 'Immun-Booster (C + Zink + Selen + Glutathion)', dur: 60, pr: 149 },
    { nm: 'Glutathion-Infusion (Anti-Aging-Master)', dur: 45, pr: 129 },
    { nm: 'Glow-Drip (Glutathion + C + Biotin)', dur: 60, pr: 189 },
    { nm: 'Detox-Drip (Glutathion + ALA + Chelat)', dur: 90, pr: 219 },
    { nm: 'Hangover-Cure (Banana Bag)', dur: 45, pr: 99 },
    { nm: 'Jetlag-Recovery', dur: 45, pr: 119 },
    { nm: 'Migräne-Infusion (Magnesium + Lidocain)', dur: 60, pr: 149 },
    { nm: 'NAD+ Infusion 250mg (Anti-Aging-Premium)', dur: 120, pr: 290 },
    { nm: 'NAD+ Infusion 500mg', dur: 180, pr: 490 },
    { nm: 'NAD+ Infusion 1000mg (Mega-Dose)', dur: 240, pr: 890 },
    { nm: 'NAD+ Booster-Kur (10 Sitzungen 250mg)', dur: 120, pr: 2490 },
    { nm: 'Sport-Recovery (Mg + Aminosäuren + Carnitin)', dur: 60, pr: 119 },
    { nm: 'Beauty-Hair-Skin (Biotin + Zink + Silizium)', dur: 60, pr: 139 },
    { nm: 'Performance-Stack (Custom-Mix nach Bluttest)', dur: 75, pr: 219 },
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
  haartransplantation: [
    { nm: 'FUE-Hohlnadel-Set (sapphire/titanium)', pr: 0, icon: '🔬' },
    { nm: 'DHI Choi-Implanter-Pen', pr: 0, icon: '✒️' },
    { nm: 'Mikroskop für Graft-Trennung', pr: 25, icon: '🔍' },
    { nm: 'Sterilisator (Autoklav)', pr: 10, icon: '🔬' },
    { nm: 'PRP-Zentrifuge', pr: 15, icon: '🌀' },
    { nm: 'Trichoskop (Haaranalyse)', pr: 10, icon: '🔬' },
    { nm: 'OP-Liege höhenverstellbar', pr: 0, icon: '🛏️' },
    { nm: 'Kühlung (Cooling-System)', pr: 8, icon: '❄️' },
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
