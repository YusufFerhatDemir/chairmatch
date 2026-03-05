import { supabase } from './supabase'

interface CheckoutParams {
  salonName: string
  serviceName: string
  priceCents: number
  bookingId?: string
  customerEmail?: string
}

export async function createCheckoutSession(params: CheckoutParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        salon_name: params.salonName,
        service_name: params.serviceName,
        price_cents: params.priceCents,
        booking_id: params.bookingId,
        customer_email: params.customerEmail,
        success_url: `${window.location.origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/booking/cancel`,
      },
    })

    if (error) throw error
    return data?.url || null
  } catch (err) {
    console.error('Checkout error:', err)
    return null
  }
}

export async function redirectToCheckout(params: CheckoutParams): Promise<void> {
  const url = await createCheckoutSession(params)
  if (url) {
    window.location.href = url
  }
}
