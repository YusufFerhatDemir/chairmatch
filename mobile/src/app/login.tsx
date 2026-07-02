import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native'
import { BrandHeader } from '@/components/brand-header'
import { GoldButton } from '@/components/gold-button'
import { Input } from '@/components/input'
import { useAuth } from '@/context/auth'
import { registerForPushNotifications } from '@/lib/notifications'
import { colors, spacing } from '@/lib/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!email.trim() || !password) {
      setError('Bitte E-Mail und Passwort eingeben.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    registerForPushNotifications().catch(() => {}) // Push vorbereiten, nicht blockierend
    router.dismissTo('/(tabs)/profil')
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandHeader tagline={false} />
        <Text style={styles.title}>Willkommen zurück</Text>

        <Input
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="du@beispiel.de"
        />
        <Input
          label="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GoldButton label="Anmelden" onPress={submit} loading={loading} />

        <Pressable onPress={() => router.replace('/register')}>
          <Text style={styles.switch}>
            Noch kein Konto? <Text style={styles.switchGold}>Kostenlos registrieren</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.pad, paddingTop: 28, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.cream },
  error: { color: colors.red, fontSize: 13 },
  switch: { color: colors.stone, fontSize: 13, textAlign: 'center', marginTop: 6 },
  switchGold: { color: colors.gold2, fontWeight: '600' },
})
