import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { euro } from '@/lib/format'
import { colors, spacing } from '@/lib/theme'
import { TYPE_LABELS, type Rental } from '@/lib/types'

export function ListingCard({ rental }: { rental: Rental }) {
  const router = useRouter()
  const image = rental.images?.[0]

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/inserat/[id]', params: { id: rental.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.image} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <MaterialCommunityIcons name="chair-rolling" size={34} color={colors.gold} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.type}>{TYPE_LABELS[rental.type] ?? rental.type}</Text>
          {rental.salon?.is_verified ? (
            <View style={styles.verified}>
              <MaterialCommunityIcons name="check-decagram" size={12} color={colors.gold2} />
              <Text style={styles.verifiedText}>Verifiziert</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {rental.name ?? 'Inserat'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[rental.salon?.name, rental.salon?.city].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{euro(rental.price_per_day_cents)}</Text>
          <Text style={styles.priceUnit}>/ Tag</Text>
          {rental.price_per_month_cents ? (
            <Text style={styles.priceMonth}>· {euro(rental.price_per_month_cents)} / Monat</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.c1,
    borderRadius: spacing.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 150, backgroundColor: colors.c2 },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.gold2,
    fontWeight: '700',
  },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedText: { fontSize: 10, color: colors.gold2, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '700', color: colors.cream, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.stone },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  price: { fontSize: 17, fontWeight: '700', color: colors.gold2 },
  priceUnit: { fontSize: 12, color: colors.stone },
  priceMonth: { fontSize: 12, color: colors.stone2 },
})
