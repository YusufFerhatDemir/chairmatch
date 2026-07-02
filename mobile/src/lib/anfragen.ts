import AsyncStorage from '@react-native-async-storage/async-storage'

// Lokale Anfrage-Ablage — gleiche Semantik wie die Web-App
// (src/app/(public)/inserat/[id]/anfragen/page.tsx nutzt localStorage `cm_mietanfragen`).
const KEY = 'cm_mietanfragen'
const MAX = 30

export interface Mietanfrage {
  id: string
  inseratId: string
  inseratName: string
  typ: 'miete' | 'besichtigung'
  duration: string
  date: string
  time: string
  units: string
  message: string
  total: number
  sentAt: string
  status: 'open'
}

export async function loadAnfragen(): Promise<Mietanfrage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Mietanfrage[]) : []
  } catch {
    return []
  }
}

export async function saveAnfrage(anfrage: Mietanfrage): Promise<void> {
  const existing = await loadAnfragen()
  existing.unshift(anfrage)
  await AsyncStorage.setItem(KEY, JSON.stringify(existing.slice(0, MAX)))
}
