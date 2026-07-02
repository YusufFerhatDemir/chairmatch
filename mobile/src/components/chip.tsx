import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '@/lib/theme'

interface Props {
  label: string
  active?: boolean
  onPress: () => void
}

export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.active, pressed && { opacity: 0.8 }]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHi,
  },
  active: {
    backgroundColor: colors.goldDim,
    borderColor: colors.gold2,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '600', color: colors.stone },
  labelActive: { color: colors.gold2 },
})
