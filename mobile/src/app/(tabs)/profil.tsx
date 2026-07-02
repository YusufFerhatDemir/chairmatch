import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { GoldButton } from '@/components/gold-button'
import { useAuth } from '@/context/auth'
import { loadAnfragen, type Mietanfrage } from '@/lib/anfragen'
import { euro } from '@/lib/format'
import { registerForPushNotifications } from '@/lib/notifications'
import { colors, spacing } from '@/lib/theme'

export default function ProfilScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, signOut } = useAuth()
  const [anfragen, setAnfragen] = useState<Mietanfrage[]>([])
  const [pushEnabled, setPushEnabled] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadAnfragen().then(setAnfragen)
    }, [])
  )

  async function enablePush() {
    const token = await registerForPushNotifications()
    if (token) {
      setPushEnabled(true)
      Alert.alert('Aktiviert', 'Push-Benachrichtigungen sind eingerichtet.')
    } else {
      Alert.alert(
        'Noch nicht verfügbar',
        'Berechtigung fehlt oder das EAS-Projekt ist noch nicht verknüpft. Push ist vorbereitet und wird mit dem ersten App-Store-Build aktiv.'
      )
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Text style={styles.title}>Profil</Text>

      {session ? (
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={26} color={colors.gold2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>
                {(session.user.user_metadata?.full_name as string) || 'ChairMatch-Mitglied'}
              </Text>
              <Text style={styles.userMail}>{session.user.email}</Text>
            </View>
          </View>
          <GoldButton label="Abmelden" variant="ghost" onPress={signOut} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            Melde dich an, um Anfragen zu senden und deine Buchungen zu verwalten.
          </Text>
          <GoldButton label="Anmelden" onPress={() => router.push('/login')} />
          <GoldButton label="Kostenlos registrieren" variant="ghost" onPress={() => router.push('/register')} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meine Anfragen</Text>
        {anfragen.length === 0 ? (
          <Text style={styles.muted}>
            Noch keine Anfragen. Such dir ein Inserat und stell eine unverbindliche Anfrage.
          </Text>
        ) : (
          anfragen.map((a) => (
            <View key={a.id} style={styles.anfrage}>
              <View style={{ flex: 1 }}>
                <Text style={styles.anfrageName} numberOfLines={1}>
                  {a.inseratName}
                </Text>
                <Text style={styles.anfrageMeta}>
                  {a.typ === 'besichtigung' ? 'Besichtigung' : `Miete · ${a.duration}`} · {a.date}
                  {a.time ? ` · ${a.time}` : ''}
                </Text>
              </View>
              <Text style={styles.anfragePrice}>
                {a.typ === 'besichtigung' ? 'kostenlos' : euro(a.total * 100)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Einstellungen</Text>
        <Pressable style={styles.settingRow} onPress={enablePush}>
          <MaterialCommunityIcons
            name={pushEnabled ? 'bell-check-outline' : 'bell-outline'}
            size={20}
            color={colors.gold2}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Push-Benachrichtigungen</Text>
            <Text style={styles.muted}>
              {pushEnabled ? 'Aktiviert' : 'Bei neuen Antworten & Angeboten benachrichtigen'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.settingRow}
          onPress={() => Linking.openURL('https://www.chairmatch.de')}
        >
          <MaterialCommunityIcons name="web" size={20} color={colors.gold2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>chairmatch.de öffnen</Text>
            <Text style={styles.muted}>Volles Vermieter-Dashboard im Web</Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.footer}>ChairMatch · Deutschlands Marktplatz für Stuhlmiete in der Beauty-Branche</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.pad, paddingBottom: 40, gap: 22 },
  title: { fontSize: 20, fontWeight: '700', color: colors.cream },
  card: {
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radiusLg,
    padding: 16,
    gap: 12,
  },
  cardText: { color: colors.stone, fontSize: 13, lineHeight: 19 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { color: colors.cream, fontSize: 15, fontWeight: '700' },
  userMail: { color: colors.stone, fontSize: 12, marginTop: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.cream },
  muted: { color: colors.stone, fontSize: 12, lineHeight: 17 },
  anfrage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 13,
  },
  anfrageName: { color: colors.cream, fontSize: 13, fontWeight: '600' },
  anfrageMeta: { color: colors.stone, fontSize: 11, marginTop: 2 },
  anfragePrice: { color: colors.gold2, fontSize: 13, fontWeight: '700' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.c1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 13,
  },
  settingLabel: { color: colors.cream, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  footer: { color: colors.stone2, fontSize: 11, textAlign: 'center', lineHeight: 16 },
})
