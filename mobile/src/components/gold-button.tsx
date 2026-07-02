import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native'
import { colors, spacing } from '@/lib/theme'

interface Props {
  label: string
  onPress: () => void
  variant?: 'primary' | 'ghost'
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
}

export function GoldButton({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  const primary = variant === 'primary'
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.ghost,
        (pressed || disabled || loading) && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? '#1a1000' : colors.gold2} />
      ) : (
        <Text style={[styles.label, primary ? styles.labelPrimary : styles.labelGhost]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: spacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.gold2,
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  ghost: {
    backgroundColor: colors.goldDim,
    borderWidth: 1,
    borderColor: colors.borderHi,
  },
  label: { fontSize: 14, fontWeight: '700' },
  labelPrimary: { color: '#1a1000' },
  labelGhost: { color: colors.gold2 },
})
