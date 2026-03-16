// Legacy PROVS & SPECS data — fallback until DB has real salons

export interface DemoSpec {
  id: string
  nm: string
  role: string
  rt: number
  cat: string
  ini: string
  col: string
}

export interface DemoService {
  id: string
  nm: string
  dur: number
  pr: number
}

export interface DemoReview {
  u: string
  s: number
  t: string
  d: string
}

export interface DemoGallery {
  b: string
  a: string
  sv: string
}

export interface DemoRental {
  type: 'stuhl' | 'liege' | 'raum' | 'opraum'
  pr: number
}

export interface DemoProvider {
  id: string
  cat: string
  nm: string
  st: string
  city: string
  rt: number
  rc: number
  tl: string
  tags: string[]
  disc: number
  bc: string
  prom: boolean
  ver: boolean
  live: boolean
  frei: number
  tier: 'gold' | 'premium' | 'starter'
  boost: number
  logo: string | null
  sps: string[]
  rental: DemoRental[]
  svs: DemoService[]
  revs: DemoReview[]
  gal: DemoGallery[]
}

export const SPECS: DemoSpec[] = [
  { id: 's1', nm: 'Ahmed K.', role: 'Master Barber', rt: 4.9, cat: 'barber', ini: 'AK', col: '#2A4A3A' },
  { id: 's2', nm: 'Sofia M.', role: 'Kosmetikerin', rt: 4.8, cat: 'kosmetik', ini: 'SM', col: '#4A2A3A' },
  { id: 's3', nm: 'Dr. Meyer', role: 'Ästhetik Arzt', rt: 5.0, cat: 'aesthetik', ini: 'DM', col: '#1A3050' },
  { id: 's4', nm: 'Lena B.', role: 'Nail Artist', rt: 4.9, cat: 'nail', ini: 'LB', col: '#3A3828' },
  { id: 's5', nm: 'Marcus R.', role: 'Senior Barber', rt: 4.7, cat: 'barber', ini: 'MR', col: '#2A3828' },
  { id: 's6', nm: 'Julia H.', role: 'Friseurmeisterin', rt: 4.9, cat: 'friseur', ini: 'JH', col: '#3A2840' },
  { id: 's7', nm: 'Kenan A.', role: 'Masseur', rt: 5.0, cat: 'massage', ini: 'KA', col: '#1A3430' },
  { id: 's8', nm: 'Elif T.', role: 'Friseurin', rt: 4.8, cat: 'friseur', ini: 'ET', col: '#3A2048' },
  { id: 's9', nm: 'Jan W.', role: 'Barber', rt: 4.6, cat: 'barber', ini: 'JW', col: '#283A28' },
  { id: 's10', nm: 'Sarah L.', role: 'Kosmetikerin', rt: 4.9, cat: 'kosmetik', ini: 'SL', col: '#4A2848' },
  { id: 's11', nm: 'Mia K.', role: 'Nail Designerin', rt: 4.8, cat: 'nail', ini: 'MK', col: '#38382A' },
  { id: 's12', nm: 'Timo F.', role: 'Masseur', rt: 4.7, cat: 'massage', ini: 'TF', col: '#1A3028' },
  { id: 's13', nm: 'Nadine R.', role: 'Lash Stylistin', rt: 4.9, cat: 'lash', ini: 'NR', col: '#3A3020' },
  { id: 's14', nm: 'Dr. Schneider', role: 'Dermatologe', rt: 4.8, cat: 'arzt', ini: 'DS', col: '#1A2840' },
]

export const PROVS: DemoProvider[] = [
  {
    id: 'p1', cat: 'barber', nm: 'BlackLabel Barbershop', st: 'Münchener Str. 17', city: 'Frankfurt',
    rt: 4.9, rc: 412, tl: 'Premium Fades & Beard Design',
    tags: ['Fade', 'Skin Fade', 'Bart', 'Herrenschnitt', 'Rasur'],
    disc: 15, bc: '#D6B15A', prom: true, ver: true, live: true, frei: 3,
    tier: 'gold', boost: 95, logo: null, sps: ['s1', 's5'],
    rental: [{ type: 'stuhl', pr: 45 }, { type: 'raum', pr: 60 }],
    svs: [
      { id: 'sv1', nm: 'Signature Cut', dur: 40, pr: 42 },
      { id: 'sv2', nm: 'Skin Fade', dur: 45, pr: 48 },
      { id: 'sv3', nm: 'Beard Design', dur: 30, pr: 28 },
    ],
    revs: [
      { u: 'Tobias K.', s: 5, t: 'Absolut top! Bester Barber in Frankfurt.', d: '12.02.2026' },
      { u: 'Markus L.', s: 5, t: 'Super Atmosphäre und perfekter Schnitt.', d: '05.02.2026' },
    ],
    gal: [
      { b: '#3A2818', a: '#5A4828', sv: 'Skin Fade' },
      { b: '#2A1A10', a: '#4A3A20', sv: 'Beard Design' },
    ],
  },
  {
    id: 'p2', cat: 'kosmetik', nm: 'Glow Studio', st: 'Schillerstr. 8', city: 'München',
    rt: 4.8, rc: 287, tl: 'Luxury Skincare & Anti-Aging',
    tags: ['Facial', 'Peeling', 'Anti-Aging', 'Microdermabrasion'],
    disc: 10, bc: '#C86090', prom: true, ver: true, live: true, frei: 5,
    tier: 'gold', boost: 90, logo: null, sps: ['s2', 's10'],
    rental: [{ type: 'raum', pr: 55 }],
    svs: [
      { id: 'sv4', nm: 'Luxus Facial', dur: 75, pr: 95 },
      { id: 'sv5', nm: 'Chemical Peeling', dur: 45, pr: 65 },
      { id: 'sv6', nm: 'Microdermabrasion', dur: 50, pr: 85 },
    ],
    revs: [
      { u: 'Anna B.', s: 5, t: 'Meine Haut war noch nie so strahlend!', d: '10.02.2026' },
      { u: 'Lisa M.', s: 4, t: 'Tolle Beratung, etwas teuer.', d: '01.02.2026' },
    ],
    gal: [
      { b: '#4A2838', a: '#6A4858', sv: 'Facial' },
      { b: '#3A1828', a: '#5A3848', sv: 'Peeling' },
    ],
  },
  {
    id: 'p3', cat: 'aesthetik', nm: 'AesthetiQ Klinik', st: 'Kurfürstendamm 42', city: 'Berlin',
    rt: 5.0, rc: 156, tl: 'Premium Ästhetik & Anti-Aging',
    tags: ['Botox', 'Filler', 'Lippen', 'Anti-Aging', 'PRP'],
    disc: 0, bc: '#4AA0D8', prom: true, ver: true, live: true, frei: 2,
    tier: 'gold', boost: 98, logo: null, sps: ['s3'],
    rental: [{ type: 'opraum', pr: 180 }],
    svs: [
      { id: 'sv7', nm: 'Botox Premium', dur: 30, pr: 290 },
      { id: 'sv8', nm: 'Hyaluron Filler', dur: 45, pr: 390 },
      { id: 'sv9', nm: 'PRP Vampire Facial', dur: 60, pr: 350 },
    ],
    revs: [
      { u: 'Sandra W.', s: 5, t: 'Dr. Meyer ist ein Künstler! Natürliches Ergebnis.', d: '14.02.2026' },
      { u: 'Claudia F.', s: 5, t: 'Professionell und diskret.', d: '08.02.2026' },
    ],
    gal: [
      { b: '#1A2840', a: '#3A4860', sv: 'Botox' },
      { b: '#1A3050', a: '#3A5070', sv: 'Filler' },
    ],
  },
  {
    id: 'p4', cat: 'nail', nm: 'NailArt Lounge', st: 'Breite Str. 12', city: 'Köln',
    rt: 4.9, rc: 203, tl: 'Kreative Nagelkunst & Design',
    tags: ['Gel', 'Nail Art', 'French', 'Chrome', 'Maniküre'],
    disc: 20, bc: '#C8987A', prom: false, ver: true, live: true, frei: 4,
    tier: 'premium', boost: 75, logo: null, sps: ['s4', 's11'],
    rental: [{ type: 'stuhl', pr: 30 }],
    svs: [
      { id: 'sv10', nm: 'Gel Maniküre Deluxe', dur: 70, pr: 55 },
      { id: 'sv11', nm: 'Chrome Nails', dur: 80, pr: 65 },
      { id: 'sv12', nm: 'Nail Art Design', dur: 90, pr: 75 },
    ],
    revs: [
      { u: 'Jessica T.', s: 5, t: 'Wunderschöne Designs, hält ewig!', d: '11.02.2026' },
      { u: 'Melanie R.', s: 5, t: 'Lena ist die Beste!', d: '03.02.2026' },
    ],
    gal: [
      { b: '#3A2818', a: '#5A4838', sv: 'Chrome Nails' },
      { b: '#2A1810', a: '#4A3830', sv: 'Nail Art' },
    ],
  },
  {
    id: 'p5', cat: 'friseur', nm: 'Salon Elegance', st: 'Hauptstr. 55', city: 'Hamburg',
    rt: 4.9, rc: 328, tl: 'Meisterfriseur seit 2005',
    tags: ['Balayage', 'Highlights', 'Brautfrisur', 'Coloration'],
    disc: 0, bc: '#9A70C8', prom: true, ver: true, live: true, frei: 6,
    tier: 'premium', boost: 80, logo: null, sps: ['s6', 's8'],
    rental: [{ type: 'stuhl', pr: 40 }, { type: 'raum', pr: 50 }],
    svs: [
      { id: 'sv13', nm: 'Balayage Premium', dur: 120, pr: 130 },
      { id: 'sv14', nm: 'Damenschnitt & Styling', dur: 60, pr: 55 },
      { id: 'sv15', nm: 'Brautfrisur Paket', dur: 120, pr: 150 },
    ],
    revs: [
      { u: 'Marie S.', s: 5, t: 'Mein Balayage sieht fantastisch aus!', d: '09.02.2026' },
      { u: 'Kathrin P.', s: 5, t: 'Julia versteht genau was man möchte.', d: '02.02.2026' },
    ],
    gal: [
      { b: '#3A2040', a: '#5A4060', sv: 'Balayage' },
      { b: '#2A1030', a: '#4A3050', sv: 'Brautfrisur' },
    ],
  },
  {
    id: 'p6', cat: 'massage', nm: 'ZenTouch Massage', st: 'Gartenstr. 22', city: 'Düsseldorf',
    rt: 5.0, rc: 178, tl: 'Therapeutische Massagen & Wellness',
    tags: ['Thai', 'Hot Stone', 'Tiefengewebe', 'Shiatsu'],
    disc: 0, bc: '#4AA890', prom: false, ver: true, live: true, frei: 3,
    tier: 'premium', boost: 70, logo: null, sps: ['s7', 's12'],
    rental: [{ type: 'liege', pr: 35 }],
    svs: [
      { id: 'sv16', nm: 'Thai Massage', dur: 60, pr: 75 },
      { id: 'sv17', nm: 'Hot Stone Premium', dur: 90, pr: 110 },
      { id: 'sv18', nm: 'Deep Tissue', dur: 60, pr: 85 },
    ],
    revs: [
      { u: 'Thomas H.', s: 5, t: 'Kenan ist ein Meister seines Fachs.', d: '13.02.2026' },
      { u: 'Petra G.', s: 5, t: 'Endlich schmerzfrei! Danke!', d: '07.02.2026' },
    ],
    gal: [
      { b: '#1A3430', a: '#3A5450', sv: 'Hot Stone' },
      { b: '#1A2828', a: '#3A4848', sv: 'Thai' },
    ],
  },
  {
    id: 'p7', cat: 'lash', nm: 'Lash & Brow Bar', st: 'Friedrichstr. 90', city: 'Berlin',
    rt: 4.9, rc: 245, tl: 'Premium Lash Extensions & Brow Design',
    tags: ['Volume Lash', 'Classic', 'Lifting', 'Brow Lamination'],
    disc: 10, bc: '#B8A060', prom: true, ver: true, live: true, frei: 2,
    tier: 'gold', boost: 85, logo: null, sps: ['s13'],
    rental: [{ type: 'stuhl', pr: 35 }],
    svs: [
      { id: 'sv19', nm: 'Volume Lash Set', dur: 120, pr: 130 },
      { id: 'sv20', nm: 'Classic Extensions', dur: 90, pr: 90 },
      { id: 'sv21', nm: 'Brow Lamination', dur: 45, pr: 50 },
    ],
    revs: [
      { u: 'Nina F.', s: 5, t: 'Die schönsten Wimpern ever!', d: '12.02.2026' },
      { u: 'Kira S.', s: 5, t: 'Nadine ist so talentiert.', d: '06.02.2026' },
    ],
    gal: [
      { b: '#3A3020', a: '#5A5040', sv: 'Volume Lash' },
      { b: '#2A2010', a: '#4A4030', sv: 'Brow Lamination' },
    ],
  },
  {
    id: 'p8', cat: 'arzt', nm: 'DermaCare Praxis', st: 'Leopoldstr. 33', city: 'München',
    rt: 4.8, rc: 134, tl: 'Dermatologie & Laser Therapie',
    tags: ['Hautkrebs', 'Laser', 'Akne', 'Pigmentflecken'],
    disc: 0, bc: '#6090C8', prom: false, ver: true, live: true, frei: 1,
    tier: 'premium', boost: 65, logo: null, sps: ['s14'],
    rental: [],
    svs: [
      { id: 'sv22', nm: 'Hautkrebs-Screening', dur: 30, pr: 95 },
      { id: 'sv23', nm: 'Laser Pigmentflecken', dur: 45, pr: 190 },
      { id: 'sv24', nm: 'Akne Intensiv-Behandlung', dur: 50, pr: 130 },
    ],
    revs: [
      { u: 'Michael B.', s: 5, t: 'Dr. Schneider ist sehr kompetent.', d: '10.02.2026' },
      { u: 'Susanne K.', s: 4, t: 'Lange Wartezeiten, aber gute Behandlung.', d: '04.02.2026' },
    ],
    gal: [
      { b: '#1A2840', a: '#3A4860', sv: 'Laser' },
    ],
  },
  {
    id: 'p9', cat: 'barber', nm: "King's Cut", st: 'Zeil 44', city: 'Frankfurt',
    rt: 4.7, rc: 189, tl: 'Classic & Modern Barbering',
    tags: ['Herrenschnitt', 'Fade', 'Rasur', 'Bart'],
    disc: 10, bc: '#2A4A3A', prom: false, ver: true, live: true, frei: 4,
    tier: 'starter', boost: 40, logo: null, sps: ['s9'],
    rental: [{ type: 'stuhl', pr: 35 }],
    svs: [
      { id: 'sv25', nm: 'Classic Cut', dur: 35, pr: 32 },
      { id: 'sv26', nm: 'Premium Fade', dur: 45, pr: 40 },
      { id: 'sv27', nm: 'Hot Towel Shave', dur: 30, pr: 28 },
    ],
    revs: [
      { u: 'Stefan M.', s: 5, t: 'Top Barbershop, faire Preise.', d: '11.02.2026' },
      { u: 'Kevin A.', s: 4, t: 'Guter Schnitt, manchmal Wartezeit.', d: '05.02.2026' },
    ],
    gal: [
      { b: '#283A28', a: '#485A48', sv: 'Fade' },
    ],
  },
  {
    id: 'p10', cat: 'friseur', nm: 'Haarwerk Studio', st: 'Königstr. 30', city: 'Stuttgart',
    rt: 4.8, rc: 267, tl: 'Kreative Haarkunst & Farbe',
    tags: ['Schnitt', 'Farbe', 'Strähnchen', 'Styling'],
    disc: 0, bc: '#9A70C8', prom: false, ver: true, live: true, frei: 3,
    tier: 'starter', boost: 35, logo: null, sps: ['s8'],
    rental: [{ type: 'stuhl', pr: 38 }],
    svs: [
      { id: 'sv28', nm: 'Kreativ-Schnitt', dur: 50, pr: 48 },
      { id: 'sv29', nm: 'Komplett-Coloration', dur: 90, pr: 90 },
      { id: 'sv30', nm: 'Strähnchen Technik', dur: 100, pr: 100 },
    ],
    revs: [
      { u: 'Helena W.', s: 5, t: 'Elif zaubert die schönsten Farben!', d: '09.02.2026' },
      { u: 'Daniela R.', s: 4, t: 'Gutes Ergebnis, nettes Team.', d: '03.02.2026' },
    ],
    gal: [
      { b: '#3A2048', a: '#5A4068', sv: 'Coloration' },
    ],
  },
  {
    id: 'p11', cat: 'kosmetik', nm: 'Pure Beauty Lab', st: 'Sendlinger Str. 15', city: 'München',
    rt: 4.7, rc: 198, tl: 'Medical Skincare & Treatments',
    tags: ['Facial', 'Laser', 'Anti-Aging', 'Ultraschall'],
    disc: 5, bc: '#C86090', prom: false, ver: true, live: true, frei: 2,
    tier: 'starter', boost: 30, logo: null, sps: ['s10'],
    rental: [],
    svs: [
      { id: 'sv31', nm: 'Medical Facial', dur: 60, pr: 80 },
      { id: 'sv32', nm: 'Anti-Aging Intensiv', dur: 75, pr: 110 },
      { id: 'sv33', nm: 'Ultraschall-Lifting', dur: 45, pr: 90 },
    ],
    revs: [
      { u: 'Birgit H.', s: 5, t: 'Professionelle Behandlung, top Ergebnis!', d: '08.02.2026' },
      { u: 'Monika L.', s: 4, t: 'Gute Beratung, schöne Atmosphäre.', d: '02.02.2026' },
    ],
    gal: [
      { b: '#4A2848', a: '#6A4868', sv: 'Facial' },
    ],
  },
  {
    id: 'p12', cat: 'nail', nm: 'Glam Nails Berlin', st: 'Torstr. 77', city: 'Berlin',
    rt: 4.8, rc: 156, tl: 'Trendy Nail Designs & Care',
    tags: ['Shellac', 'Gel', 'Pediküre', 'Nail Art'],
    disc: 0, bc: '#C8987A', prom: false, ver: false, live: true, frei: 5,
    tier: 'starter', boost: 25, logo: null, sps: ['s11'],
    rental: [],
    svs: [
      { id: 'sv34', nm: 'Shellac Classic', dur: 45, pr: 38 },
      { id: 'sv35', nm: 'Gel Full Set', dur: 75, pr: 55 },
      { id: 'sv36', nm: 'Spa Pediküre', dur: 55, pr: 45 },
    ],
    revs: [
      { u: 'Lea K.', s: 5, t: 'Immer perfekte Nägel!', d: '10.02.2026' },
      { u: 'Janine F.', s: 4, t: 'Schöner Salon, nettes Personal.', d: '04.02.2026' },
    ],
    gal: [
      { b: '#38382A', a: '#58584A', sv: 'Shellac' },
    ],
  },
  {
    id: 'p13', cat: 'massage', nm: 'Wellness Oase', st: 'Am Stadtpark 5', city: 'Hamburg',
    rt: 4.6, rc: 142, tl: 'Entspannung pur',
    tags: ['Klassisch', 'Aromatherapie', 'Fußreflexzonen'],
    disc: 0, bc: '#4AA890', prom: false, ver: true, live: true, frei: 4,
    tier: 'starter', boost: 20, logo: null, sps: ['s12'],
    rental: [{ type: 'liege', pr: 30 }],
    svs: [
      { id: 'sv37', nm: 'Klassische Massage', dur: 60, pr: 65 },
      { id: 'sv38', nm: 'Aromatherapie', dur: 75, pr: 85 },
      { id: 'sv39', nm: 'Fußreflexzonen', dur: 30, pr: 40 },
    ],
    revs: [
      { u: 'Uwe S.', s: 5, t: 'Beste Massage in Hamburg!', d: '07.02.2026' },
      { u: 'Gabi M.', s: 4, t: 'Sehr entspannend, gerne wieder.', d: '01.02.2026' },
    ],
    gal: [
      { b: '#1A3028', a: '#3A5048', sv: 'Klassisch' },
    ],
  },
  {
    id: 'p14', cat: 'lash', nm: 'Lash Perfect Studio', st: 'Schildergasse 20', city: 'Köln',
    rt: 4.7, rc: 167, tl: 'Perfekte Wimpern & Brauen',
    tags: ['Extensions', 'Lifting', 'Tinting', 'Brow'],
    disc: 15, bc: '#B8A060', prom: false, ver: true, live: true, frei: 3,
    tier: 'starter', boost: 30, logo: null, sps: ['s13'],
    rental: [],
    svs: [
      { id: 'sv40', nm: 'Lash Lifting & Tinting', dur: 60, pr: 55 },
      { id: 'sv41', nm: 'Classic Extensions', dur: 90, pr: 85 },
      { id: 'sv42', nm: 'Brow Shaping', dur: 30, pr: 28 },
    ],
    revs: [
      { u: 'Vanessa P.', s: 5, t: 'Sehen so natürlich aus!', d: '12.02.2026' },
      { u: 'Carmen D.', s: 4, t: 'Gutes Ergebnis, empfehlenswert.', d: '06.02.2026' },
    ],
    gal: [
      { b: '#3A3020', a: '#5A5040', sv: 'Lifting' },
    ],
  },
  {
    id: 'p15', cat: 'opraum', nm: 'MedSpace Premium', st: 'Universitätsstr. 10', city: 'Düsseldorf',
    rt: 4.9, rc: 45, tl: 'Sterile OP-Räume auf höchstem Niveau',
    tags: ['OP-Raum', 'Steril', 'Chirurgie', 'Miete'],
    disc: 0, bc: '#50B8A0', prom: true, ver: true, live: true, frei: 1,
    tier: 'gold', boost: 88, logo: null, sps: [],
    rental: [{ type: 'opraum', pr: 450 }],
    svs: [
      { id: 'sv43', nm: 'OP-Raum Tagesmiete', dur: 480, pr: 450 },
      { id: 'sv44', nm: 'OP-Raum Halbtag', dur: 240, pr: 280 },
    ],
    revs: [
      { u: 'Dr. Schmidt', s: 5, t: 'Erstklassige Ausstattung!', d: '10.02.2026' },
    ],
    gal: [
      { b: '#1A3830', a: '#3A5850', sv: 'OP-Raum' },
    ],
  },
  {
    id: 'p16', cat: 'arzt', nm: 'HairClinic Pro', st: 'Schloßstr. 8', city: 'Berlin',
    rt: 4.8, rc: 89, tl: 'Haartransplantation & Haarmedizin',
    tags: ['Haartransplantation', 'PRP', 'Mesotherapie'],
    disc: 0, bc: '#6090C8', prom: false, ver: true, live: true, frei: 2,
    tier: 'premium', boost: 60, logo: null, sps: ['s14'],
    rental: [],
    svs: [
      { id: 'sv45', nm: 'Haartransplantation Beratung', dur: 60, pr: 0 },
      { id: 'sv46', nm: 'PRP Haarwachstum', dur: 45, pr: 300 },
      { id: 'sv47', nm: 'Mesotherapie Haare', dur: 30, pr: 180 },
    ],
    revs: [
      { u: 'Oliver T.', s: 5, t: 'Endlich wieder volles Haar! Danke!', d: '11.02.2026' },
      { u: 'Frank W.', s: 5, t: 'Sehr professionelle Beratung.', d: '05.02.2026' },
    ],
    gal: [
      { b: '#1A2840', a: '#3A4860', sv: 'Haartransplantation' },
    ],
  },
]

export const SEARCH_SUGGESTIONS = [
  'Haartransplantation', 'Botox', 'Balayage', 'Skin Fade',
  'Wimpern', 'Massage', 'Nail Art', 'Peeling',
]

export const CITIES = [...new Set(PROVS.map(p => p.city))].sort()

export function getSpecById(id: string): DemoSpec | undefined {
  return SPECS.find(s => s.id === id)
}

export function getProviderSpecs(p: DemoProvider): DemoSpec[] {
  return p.sps.map(id => SPECS.find(s => s.id === id)).filter(Boolean) as DemoSpec[]
}
