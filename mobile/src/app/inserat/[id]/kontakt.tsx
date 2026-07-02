import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Chip } from '@/components/chip'
import { GoldButton } from '@/components/gold-button'
import { Input } from '@/components/input'
import { saveAnfrage } from '@/lib/anfragen'
import { fetchRental } from '@/lib/rentals'
import { colors, spacing } from '@/lib/theme'
import type { Rental } from '@/lib/types'

// Gleiche Konditionen wie der Web-Anfrage-Flow (inserat/[id]/anfragen)
const DURATIONS = [
  { id: 'hour', label: 'Stundenweise', mult: 1 },
  { id: 'day', label: 'Tag', mult: 8 },
  { id: 'week', label: 'Woche', mult: 40 },
  { id: 'month', label: 'Monat', mult: 160 },
] as const

const PRICE_PER_HOUR = 15

export default function KontaktScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [rental, setRental] = useState<Rental | null>(null)
  const [typ, setTyp] = useState<'miete' | 'besichtigung'>('miete')
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]['id']>('day')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [units, setUnits] = useState('1')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) fetchRental(id).then(setRental).catch(() => {})
  }, [id])

  const dur = DURATIONS.find((d) => d.id === duration)!
  const totalHours = Number(units || 0) * dur.mult
  const totalPrice = totalHours * PRICE_PER_HOUR

  async function send() {
    if (!date.trim()) {
      Alert.alert('Datum fehlt', 'Bitte gib ein Wunschdatum an (z. B. 15.07.2026).')
      return
    }
    if (typ === 'miete' && !message.trim()) {
      Alert.alert('Nachricht fehlt', 'Bitte schreib dem Vermieter eine kurze Nachricht.')
      return
    }
    setSubmitting(true)
    await saveAnfrage({
      id: `r${Date.now()}`,
      inseratId: id ?? '',
      inseratName: rental?.name ?? 'Inserat',
      typ,
      duration: typ === 'besichtigung' ? 'Besichtigung' : dur.label,
      date: date.trim(),
      time,
      units: typ === 'besichtigung' ? '1' : units,
      message,
      total: typ === 'besichtigung' ? 0 : totalPrice,
      sentAt: new Date().toISOString(),
      status: 'open',
    })
    setSubmitting(false)
    Alert.alert(
      'Anfrage gesendet',
      typ === 'besichtigung'
        ? 'Deine Besichtigungsanfrage ist raus — kostenlos und unverbindlich.'
        : 'Deine Mietanfrage ist raus. Gezahlt wird erst nach Bestätigung.',
      [{ text: 'OK', onPress: () => router.dismissTo('/(tabs)/profil') }]
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.to}>
          An: {[rental?.salon?.name, rental?.name].filter(Boolean).join(' · ') || 'Vermieter'}
        </Text>

        <View style={styles.typRow}>
          {(
            [
              { id: 'miete', label: 'Mietanfrage', sub: 'Direkt anfragen' },
              { id: 'besichtigung', label: 'Besichtigung', sub: 'Erst ansehen — kostenlos' },
            ] as const
          ).map((t) => (
            <View key={t.id} style={{ flex: 1 }}>
              <GoldButton
                label={t.label}
                variant={typ === t.id ? 'primary' : 'ghost'}
                onPress={() => setTyp(t.id)}
              />
              <Text style={styles.typSub}>{t.sub}</Text>
            </View>
          ))}
        </View>

        {typ === 'miete' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Mietdauer</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => (
                <Chip
                  key={d.id}
                  label={d.label}
                  active={duration === d.id}
                  onPress={() => setDuration(d.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Input label="Wunschdatum" value={date} onChangeText={setDate} placeholder="15.07.2026" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Start-Zeit" value={time} onChangeText={setTime} placeholder="09:00" />
          </View>
        </View>

        {typ === 'miete' ? (
          <Input
            label={`Anzahl ${
              duration === 'hour' ? 'Stunden' : duration === 'day' ? 'Tage' : duration === 'week' ? 'Wochen' : 'Monate'
            }`}
            value={units}
            onChangeText={setUnits}
            keyboardType="number-pad"
          />
        ) : null}

        <Input
          label={typ === 'besichtigung' ? 'Nachricht (optional)' : 'Nachricht an Vermieter'}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={5}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
          placeholder={
            typ === 'besichtigung'
              ? 'Hallo, ich würde mir den Platz gerne vor Ort ansehen. Passt dir der Termin?'
              : 'Hallo, ich bin Friseurin und möchte deinen Stuhl mieten. Ich habe 5 Jahre Berufserfahrung …'
          }
        />

        <View style={styles.costBox}>
          {typ === 'miete' ? (
            <Text style={styles.costText}>
              <Text style={styles.costStrong}>Geschätzte Kosten: </Text>
              {totalHours > 0 ? `${totalHours} Std × ${PRICE_PER_HOUR} € = ${totalPrice} €` : '—'}
              {'\n'}
              <Text style={styles.costMuted}>Erst nach Bestätigung wird gezahlt. 0 % Provision.</Text>
            </Text>
          ) : (
            <Text style={styles.costText}>
              <Text style={styles.costStrong}>Besichtigung ist kostenlos. </Text>
              Du siehst dir den Platz unverbindlich an — gemietet wird erst, wenn beide Seiten wollen.
            </Text>
          )}
        </View>

        <GoldButton
          label={typ === 'besichtigung' ? 'Besichtigung anfragen →' : 'Anfrage senden →'}
          onPress={send}
          loading={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.pad, paddingBottom: 40, gap: 16 },
  to: { fontSize: 13, color: colors.stone },
  typRow: { flexDirection: 'row', gap: 10 },
  typSub: { fontSize: 10, color: colors.stone2, textAlign: 'center', marginTop: 5 },
  field: { gap: 6 },
  label: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.stone,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row2: { flexDirection: 'row', gap: 10 },
  costBox: {
    backgroundColor: colors.goldLo,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    padding: 13,
  },
  costText: { fontSize: 12.5, lineHeight: 19, color: colors.cream },
  costStrong: { color: colors.gold2, fontWeight: '700' },
  costMuted: { color: colors.stone },
})
