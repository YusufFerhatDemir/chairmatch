/**
 * trackEvent — zentraler Wrapper für analytische Events.
 *
 * Sendet parallel an:
 *   1. GA4   (window.gtag) — wenn Measurement-ID gesetzt + Consent granted
 *   2. Meta Pixel (window.fbq) — wenn Pixel-ID gesetzt + Marketing-Consent
 *   3. /api/analytics/events — eigener First-Party-Stream (analytics_events)
 *
 * Der eigene Stream ist Consent-unabhängig pseudonymisiert (session_id only,
 * keine PII, kein Cross-Site-Tracking). Damit haben wir ein eigenes Funnel-
 * Bild auch wenn der User GA4 abgelehnt hat.
 *
 * Kern-Events (`EVENT_NAMES`) sind die Stellen, an denen jede Conversion-
 * Analyse ansetzt: Registrierung, Login, Buchung, Anfrage, Chat, Profil,
 * Zahlung.
 */

import { hasAnalyticsConsent, hasAdConsent, getSessionId } from '@/lib/consent'

export const EVENT_NAMES = {
  // Auth
  REGISTER_START: 'register_start',
  REGISTER_COMPLETE: 'register_complete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  // Search & Discovery
  SEARCH: 'search',
  SALON_VIEW: 'salon_view',
  SERVICE_VIEW: 'service_view',
  // Booking-Funnel
  BOOKING_START: 'booking_start',
  BOOKING_SLOT_SELECTED: 'booking_slot_selected',
  BOOKING_COMPLETE: 'booking_complete',
  BOOKING_CANCEL: 'booking_cancel',
  // Anfragen (Stuhlvermietung, OP-Raum, etc.)
  REQUEST_SUBMITTED: 'request_submitted',
  REQUEST_ACCEPTED: 'request_accepted',
  // Chat
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  // Profil
  PROFILE_UPDATED: 'profile_updated',
  PROFILE_PHOTO_UPLOADED: 'profile_photo_uploaded',
  // Zahlung
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  // Marketplace
  PRODUCT_VIEW: 'product_view',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  ORDER_COMPLETED: 'order_completed',
} as const

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES]

export type EventProps = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

/**
 * Map zwischen unseren Event-Namen und Meta-Standard-Events.
 * Nur Conversion-relevante Events landen bei Meta — keine Browser-Pings.
 */
const META_EVENT_MAP: Partial<Record<EventName, string>> = {
  register_complete: 'CompleteRegistration',
  login: 'Login',
  search: 'Search',
  salon_view: 'ViewContent',
  service_view: 'ViewContent',
  booking_start: 'InitiateCheckout',
  booking_complete: 'Schedule',
  request_submitted: 'Lead',
  payment_initiated: 'InitiateCheckout',
  payment_success: 'Purchase',
  subscription_started: 'Subscribe',
  product_added_to_cart: 'AddToCart',
  checkout_started: 'InitiateCheckout',
  order_completed: 'Purchase',
}

function sendToGA4(name: EventName, props?: EventProps) {
  if (typeof window === 'undefined' || !window.gtag) return
  if (!hasAnalyticsConsent()) return
  window.gtag('event', name, props || {})
}

function sendToMetaPixel(name: EventName, props?: EventProps) {
  if (typeof window === 'undefined' || !window.fbq) return
  if (!hasAdConsent()) return
  const metaName = META_EVENT_MAP[name]
  if (!metaName) return
  window.fbq('track', metaName, props || {})
}

function sendToFirstPartyStream(name: EventName, props?: EventProps) {
  if (typeof window === 'undefined') return
  const session_id = getSessionId()
  const payload = {
    event_name: name,
    session_id,
    path: window.location.pathname,
    props: props || {},
    ts: Date.now(),
  }
  if ('sendBeacon' in navigator) {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/events', blob)
    return
  }
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

/** Hauptfunktion — fan-out an alle aktiven Analytics-Senken. */
export function trackEvent(name: EventName, props?: EventProps): void {
  try {
    sendToGA4(name, props)
    sendToMetaPixel(name, props)
    sendToFirstPartyStream(name, props)
  } catch {
    /* analytics darf die App nie crashen */
  }
}
