import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors, spacing } from '@/lib/theme'

interface Props extends TextInputProps {
  label: string
}

export function Input({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.stone2}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.stone,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.c1,
    color: colors.cream,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderHi,
    borderRadius: spacing.radius - 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
})
