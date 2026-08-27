/**
 * Antworttypen des Miet-Marktplatzes.
 *
 * Sie liegen hier und nicht in den Route-Dateien, damit die Client-Seiten sie
 * importieren koennen, ohne ein Server-Modul (und damit `supabase-server`
 * samt Service-Key-Zugriff) in den Browser-Bundle zu ziehen.
 *
 * Alle Betraege in CENT — Euro entsteht erst in der Anzeige. Felder, die der
 * Vermieter nicht gepflegt hat, sind `null` und bleiben es: die Oberflaeche
 * zeigt dann nichts statt eines hochgerechneten Naeherungswerts.
 */

export interface RentalListingSalon {
  id: string
  name: string | null
  city: string | null
  slug: string | null
}

export interface RentalListing {
  id: string
  name: string
  type: string
  description: string | null
  features: string[]
  images: string[]
  pricePerDayCents: number
  pricePerHourCents: number | null
  pricePerWeekCents: number | null
  pricePerMonthCents: number | null
  availableDays: string[] | null
  availableFrom: string | null
  availableTo: string | null
  salon: RentalListingSalon | null
}

export interface RevenueEquipment {
  id: string
  name: string
  pricePerDayCents: number | null
}

export interface RevenueBooking {
  id: string
  equipmentId: string
  startDate: string | null
  endDate: string | null
  totalCents: number
  status: string
  paymentStatus: string | null
  /** false bei storniert/abgelehnt/erstattet — solche Zeilen sind kein Umsatz. */
  countsAsRevenue: boolean
}

export interface RentalRevenueResponse {
  hasSalon: boolean
  equipment: RevenueEquipment[]
  bookings: RevenueBooking[]
}
