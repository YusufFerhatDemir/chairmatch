import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
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
import { colors, spacing } from '@/lib/theme'

export default function RegisterScreen() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Bitte alle Felder ausfüllen.')
      return
    }
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen haben.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await signUp(fullName.trim(), email.trim(), password)
    setLoading(false)
    if (err) {
      setError(err)
      return
    }
    Alert.alert(
      'Konto erstellt',
      'Falls eine Bestätigungs-E-Mail nötig ist, findest du sie in deinem Postfach.',
      [{ text: 'OK', onPress: () => router.dismissTo('/(tabs)/profil') }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BrandHeader tagline={false} />
        <Text style={styles.title}>Konto erstellen</Text>
        <Text style={styles.sub}>
          Kostenlos registrieren und Stühle, Kabinen & Räume in ganz Deutschland anfragen.
        </Text>

        <Input
          label="Name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
          placeholder="Vor- und Nachname"
        />
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
          autoComplete="password-new"
          placeholder="Mindestens 6 Zeichen"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <GoldButton label="Kostenlos registrieren" onPress={submit} loading={loading} />

        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.switch}>
            Schon ein Konto? <Text style={styles.switchGold}>Anmelden</Text>
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
  sub: { fontSize: 13, color: colors.stone, lineHeight: 19, marginTop: -8 },
  error: { color: colors.red, fontSize: 13 },
  switch: { color: colors.stone, fontSize: 13, textAlign: 'center', marginTop: 6 },
  switchGold: { color: colors.gold2, fontWeight: '600' },
})
