import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { colors, TAGLINE } from '@/lib/theme'

export function BrandHeader({ tagline = true }: { tagline?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="cover"
        />
        <View>
          <Text style={styles.title}>CHAIRMATCH</Text>
          <Text style={styles.sub}>DEUTSCHLAND</Text>
        </View>
      </View>
      {tagline ? <Text style={styles.tagline}>{TAGLINE}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHi,
  },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: 3, color: colors.gold2 },
  sub: { fontSize: 8, letterSpacing: 3, color: colors.gold, marginTop: 3, fontWeight: '600' },
  tagline: { fontSize: 13, color: colors.stone, lineHeight: 18 },
})
