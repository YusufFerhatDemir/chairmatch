import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { GoldButton } from '@/components/gold-button'
import { euro } from '@/lib/format'
import { fetchRental } from '@/lib/rentals'
import { colors, spacing } from '@/lib/theme'
import { TYPE_LABELS, type Rental } from '@/lib/types'

export default function InseratDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [rental, setRental] = useState<Rental | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchRental(id)
      .then((r) => {
        setRental(r)
        if (!r) setError('Dieses Inserat wurde nicht gefunden.')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Fehler beim Laden.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold2} />
      </View>
    )
  }

  if (error || !rental) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'Inserat nicht gefunden.'}</Text>
      </View>
    )
  }

  const salon = rental.salon

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {rental.images?.[0] ? (
          <Image source={{ uri: rental.images[0] }} style={styles.hero} contentFit="cover" />
        ) : (
          <View style={[styles.hero, styles.heroFallback]}>
            <MaterialCommunityIcons name="chair-rolling" size={48} color={colors.gold} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.type}>{TYPE_LABELS[rental.type] ?? rental.type}</Text>
          <Text style={styles.name}>{rental.name ?? 'Inserat'}</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceCol}>
              <Text style={styles.priceValue}>{euro(rental.price_per_day_cents)}</Text>
              <Text style={styles.priceLabel}>pro Tag</Text>
            </View>
            {rental.price_per_month_cents ? (
              <View style={styles.priceCol}>
                <Text style={styles.priceValue}>{euro(rental.price_per_month_cents)}</Text>
                <Text style={styles.priceLabel}>pro Monat</Text>
              </View>
            ) : null}
          </View>

          {rental.description ? <Text style={styles.description}>{rental.description}</Text> : null}

          {salon ? (
            <View style={styles.salonCard}>
              <View style={styles.salonHeader}>
                <Text style={styles.salonName}>{salon.name}</Text>
                {salon.is_verified ? (
                  <MaterialCommunityIcons name="check-decagram" size={16} color={colors.gold2} />
                ) : null}
              </View>
              <View style={styles.salonRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={colors.stone} />
                <Text style={styles.salonMeta}>
                  {[salon.street, salon.city].filter(Boolean).join(', ') || 'Adresse auf Anfrage'}
                </Text>
              </View>
              {salon.avg_rating ? (
                <View style={styles.salonRow}>
                  <MaterialCommunityIcons name="star" size={14} color={colors.gold2} />
                  <Text style={styles.salonMeta}>
                    {salon.avg_rating.toFixed(1).replace('.', ',')} ({salon.review_count ?? 0}{' '}
                    {salon.review_count === 1 ? 'Bewertung' : 'Bewertungen'})
                  </Text>
                </View>
              ) : null}
              {salon.description ? <Text style={styles.salonDesc}>{salon.description}</Text> : null}
            </View>
          ) : null}

          <View style={styles.hint}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.gold2} />
            <Text style={styles.hintText}>
              Besichtigung kostenlos & unverbindlich. Gezahlt wird erst nach Bestätigung — 0 % Provision für dich.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <GoldButton
          label="Kontakt aufnehmen"
          onPress={() => router.push({ pathname: '/inserat/[id]/kontakt', params: { id: rental.id } })}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.red, fontSize: 14, textAlign: 'center' },
  content: { paddingBottom: 110 },
  hero: { width: '100%', height: 230, backgroundColor: colors.c2 },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.pad, gap: 14 },
  type: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.gold2,
    fontWeight: '700',
  },
  name: { fontSize: 21, fontWeight: '700', color: colors.cream, lineHeight: 28 },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 14,
    gap: 24,
  },
  priceCol: { gap: 2 },
  priceValue: { fontSize: 19, fontWeight: '700', color: colors.gold2 },
  priceLabel: { fontSize: 11, color: colors.stone },
  description: { fontSize: 14, lineHeight: 21, color: colors.cream },
  salonCard: {
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 14,
    gap: 8,
  },
  salonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salonName: { fontSize: 15, fontWeight: '700', color: colors.cream },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  salonMeta: { fontSize: 12.5, color: colors.stone },
  salonDesc: { fontSize: 12.5, color: colors.stone, lineHeight: 18, marginTop: 2 },
  hint: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.goldLo,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 12,
    alignItems: 'flex-start',
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.cream },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.pad,
    paddingBottom: 28,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
})
