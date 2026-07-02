import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BrandHeader } from '@/components/brand-header'
import { ListingCard } from '@/components/listing-card'
import { fetchRentals } from '@/lib/rentals'
import { colors, spacing } from '@/lib/theme'
import { TYPE_ICONS, TYPE_LABELS, type Rental } from '@/lib/types'

const TYPES = ['stuhl', 'liege', 'raum', 'opraum'] as const

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [rentals, setRentals] = useState<Rental[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      setRentals(await fetchRentals())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inserate konnten nicht geladen werden.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const featured = rentals?.slice(0, 6) ?? []

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold2} />
      }
    >
      <BrandHeader />

      <Pressable style={styles.searchFake} onPress={() => router.push('/suche')}>
        <MaterialCommunityIcons name="magnify" size={18} color={colors.stone} />
        <Text style={styles.searchFakeText}>Stadt, Stuhl, Kabine oder Raum suchen …</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Was suchst du?</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((type) => (
            <Pressable
              key={type}
              style={({ pressed }) => [styles.typeCard, pressed && { opacity: 0.8 }]}
              onPress={() => router.push({ pathname: '/suche', params: { type } })}
            >
              <MaterialCommunityIcons
                name={TYPE_ICONS[type] as never}
                size={26}
                color={colors.gold2}
              />
              <Text style={styles.typeLabel}>{TYPE_LABELS[type]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Aktuelle Inserate</Text>
          <Pressable onPress={() => router.push('/suche')}>
            <Text style={styles.sectionLink}>Alle ansehen →</Text>
          </Pressable>
        </View>

        {rentals === null && !error ? (
          <ActivityIndicator color={colors.gold2} style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : featured.length === 0 ? (
          <Text style={styles.empty}>Aktuell sind keine Inserate verfügbar.</Text>
        ) : (
          <View style={{ gap: 14 }}>
            {featured.map((rental) => (
              <ListingCard key={rental.id} rental={rental} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.usp}>
        <UspRow icon="check-decagram" text="Verifizierte Vermieter" />
        <UspRow icon="cash-lock" text="0 % Provision für Mieter" />
        <UspRow icon="calendar-check" text="Tageweise mieten — ab 25 €/Tag" />
      </View>
    </ScrollView>
  )
}

function UspRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.uspRow}>
      <MaterialCommunityIcons name={icon as never} size={16} color={colors.gold2} />
      <Text style={styles.uspText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.pad, paddingBottom: 40, gap: 22 },
  searchFake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHi,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchFakeText: { color: colors.stone2, fontSize: 13 },
  section: { gap: 12 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.cream },
  sectionLink: { fontSize: 12, color: colors.gold2, fontWeight: '600' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
  },
  typeLabel: { fontSize: 12, fontWeight: '600', color: colors.cream },
  error: { color: colors.red, fontSize: 13, marginTop: 8 },
  empty: { color: colors.stone, fontSize: 13, marginTop: 8 },
  usp: {
    backgroundColor: colors.goldLo,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 14,
    gap: 10,
  },
  uspRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uspText: { color: colors.cream, fontSize: 12.5 },
})
