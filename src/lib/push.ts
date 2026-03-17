import { getSupabaseAdmin } from '@/lib/supabase-server'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:info@chairmatch.de'

interface PushSubscription {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Encode a string to URL-safe base64.
 */
function urlBase64Encode(str: string): string {
  return Buffer.from(str).toString('base64url')
}

/**
 * Build the JWT for VAPID authentication.
 * Uses the crypto module for ES256 signing.
 */
async function buildVapidHeaders(endpoint: string): Promise<{ Authorization: string; 'Crypto-Key': string }> {
  const { createSign } = await import('crypto')

  const audience = new URL(endpoint).origin

  const header = urlBase64Encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = urlBase64Encode(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      sub: VAPID_EMAIL,
    })
  )

  const unsignedToken = `${header}.${payload}`

  // VAPID_PRIVATE_KEY is expected to be a base64url-encoded 32-byte ECDSA private key
  // Build PEM from raw key for signing
  const privateKeyBuffer = Buffer.from(VAPID_PRIVATE_KEY, 'base64url')

  // For simplicity, use a PEM-wrapped PKCS8 key if available, otherwise raw signing
  // This expects VAPID_PRIVATE_KEY in standard web-push format (base64url-encoded raw key)
  const sign = createSign('SHA256')
  sign.update(unsignedToken)

  // Construct a PKCS8 DER for the EC P-256 private key
  const pkcs8Header = Buffer.from(
    '30770201010420',
    'hex'
  )
  const pkcs8Mid = Buffer.from(
    'a00a06082a8648ce3d030107a14403420004',
    'hex'
  )

  // If the private key is 32 bytes (raw), we need the public key too
  // For a complete implementation, use the web-push package
  // This is a minimal approach — prefer the web-push npm package in production
  let signature: Buffer
  try {
    const derKey = Buffer.concat([pkcs8Header, privateKeyBuffer])
    const pem = `-----BEGIN EC PRIVATE KEY-----\n${derKey.toString('base64')}\n-----END EC PRIVATE KEY-----`
    signature = sign.sign(pem)
  } catch {
    // Fallback: try using the key directly as PEM
    signature = sign.sign(VAPID_PRIVATE_KEY)
  }

  const jwt = `${unsignedToken}.${signature.toString('base64url')}`

  return {
    Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  }
}

/**
 * Save a push subscription for a user.
 */
export async function saveSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) {
    throw new Error(`Failed to save push subscription: ${error.message}`)
  }
}

/**
 * Send a push notification to a specific user.
 * Fetches their stored subscription(s) and sends via Web Push protocol.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<{ sent: number; failed: number }> {
  const supabase = getSupabaseAdmin()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch subscriptions: ${error.message}`)
  }

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      const vapidHeaders = await buildVapidHeaders(sub.endpoint)

      const response = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          ...vapidHeaders,
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          TTL: '86400',
        },
        body: payload,
      })

      if (response.status === 201 || response.status === 200) {
        sent++
      } else if (response.status === 404 || response.status === 410) {
        // Subscription expired or invalid — remove it
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', userId)
        failed++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { sent, failed }
}
