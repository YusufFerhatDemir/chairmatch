import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Chip } from '@/components/chip'
import { ListingCard } from '@/components/listing-card'
import { fetchCities, fetchRentals } from '@/lib/rentals'
import { colors, spacing } from '@/lib/theme'
import { TYPE_LABELS, type Rental } from '@/lib/types'

const TYPES = ['stuhl', 'liege', 'raum', 'opraum'] as const
const PRICE_STEPS = [
  { label: 'bis 30 €/Tag', cents: 3000 },
  { label: 'bis 50 €/Tag', cents: 5000 },
  { label: 'bis 80 €/Tag', cents: 8000 },
] as const

export default function SucheScreen() {
  const params = useLocalSearchParams<{ type?: string }>()
  const insets = useSafeAreaInsets()

  const [type, setType] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [rentals, setRentals] = useState<Rental[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Typ-Vorauswahl von der Startseite übernehmen
  useEffect(() => {
    if (params.type && TYPES.includes(params.type as (typeof TYPES)[number])) {
      setType(params.type)
    }
  }, [params.type])

  useEffect(() => {
    fetchCities().then(setCities).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    try {
      setError(null)
      setRentals(null)
      setRentals(
        await fetchRentals({
          type: type ?? undefined,
          city: city || undefined,
          maxPricePerDayCents: maxPrice ?? undefined,
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suche fehlgeschlagen.')
    }
  }, [type, city, maxPrice])

  useEffect(() => {
    const t = setTimeout(load, city ? 350 : 0) // Debounce für Stadt-Tippen
    return () => clearTimeout(t)
  }, [load, city])

  const header = useMemo(
    () => (
      <View style={styles.filters}>
        <Text style={styles.title}>Inserate durchsuchen</Text>

        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.stone} />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Stadt (z. B. Berlin, Köln, Hamburg)"
            placeholderTextColor={colors.stone2}
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPES.map((t) => (
            <Chip
              key={t}
              label={TYPE_LABELS[t]}
              active={type === t}
              onPress={() => setType(type === t ? null : t)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {PRICE_STEPS.map((p) => (
            <Chip
              key={p.cents}
              label={p.label}
              active={maxPrice === p.cents}
              onPress={() => setMaxPrice(maxPrice === p.cents ? null : p.cents)}
            />
          ))}
          {cities.slice(0, 6).map((c) => (
            <Chip key={c} label={c} active={city === c} onPress={() => setCity(city === c ? '' : c)} />
          ))}
        </ScrollView>

        {rentals !== null && !error ? (
          <Text style={styles.count}>
            {rentals.length === 1 ? '1 Inserat' : `${rentals.length} Inserate`} gefunden
          </Text>
        ) : null}
      </View>
    ),
    [city, type, maxPrice, cities, rentals, error]
  )

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      data={rentals ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ListingCard rental={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rentals === null ? (
          <ActivityIndicator color={colors.gold2} style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chair-rolling" size={34} color={colors.stone2} />
            <Text style={styles.emptyText}>
              Keine Inserate für diese Filter gefunden.{'\n'}Versuch es mit einer anderen Stadt oder ohne Preisgrenze.
            </Text>
          </View>
        )
      }
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.pad, paddingBottom: 40 },
  filters: { gap: 12, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.cream },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHi,
    borderRadius: spacing.radius,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, color: colors.cream, fontSize: 14, paddingVertical: 12 },
  chipRow: { gap: 8 },
  count: { fontSize: 12, color: colors.stone },
  error: { color: colors.red, fontSize: 13 },
  empty: { alignItems: 'center', gap: 10, marginTop: 30 },
  emptyText: { color: colors.stone, fontSize: 13, textAlign: 'center', lineHeight: 19 },
})
