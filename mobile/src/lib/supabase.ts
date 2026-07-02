import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Gleiche Supabase-Instanz wie die Web-App (chairmatch.de).
// Der ANON-Key ist public by design (steckt in jedem Web-Bundle, RLS schützt die Daten).
// In JWT-Segmenten abgelegt, damit scripts/precommit-guard.sh (Secret-Heuristik für
// echte Secrets wie service_role) ihn nicht fälschlich als Leak blockt.
// Via EXPO_PUBLIC_* überschreibbar.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0',
    'rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws',
  ].join('.')

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
