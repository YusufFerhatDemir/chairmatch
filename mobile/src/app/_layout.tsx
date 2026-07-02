import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/context/auth'
import { colors } from '@/lib/theme'

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.gold2,
          headerTitleStyle: { color: colors.cream, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="inserat/[id]/index" options={{ title: 'Inserat' }} />
        <Stack.Screen name="inserat/[id]/kontakt" options={{ title: 'Anfrage senden' }} />
        <Stack.Screen name="login" options={{ title: 'Anmelden', presentation: 'modal' }} />
        <Stack.Screen name="register" options={{ title: 'Registrieren', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  )
}
