import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '@/stores/salonStore'
import { useBookingStore } from '@/stores/bookingStore'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { t } from '@/i18n'
import { formatPriceEur, getBookingDays, getTimeSlots } from '@/lib/utils'

export function BookingPage() {
  const { salonId } = useParams()
  const navigate = useNavigate()
  const salon = useStore(s => s.salons.find(s2 => s2.id === salonId))
  const user = useAuthStore(s => s.user)
  const { step, selectedService, selectedDay, selectedSlot, customerName, customerPhone, setStep, setService, setDay, setSlot, setCustomerName, setCustomerPhone, submitBooking } = useBookingStore()
  const [submitting, setSubmitting] = useState(false)

  if (!salon) return (
    <div style={{ padding: 'var(--pad)', textAlign: 'center', paddingTop: 60 }}>
      <p style={{ color: 'var(--stone)' }}>{t('salon_not_found')}</p>
      <Button variant="outline" onClick={() => navigate('/')} style={{ marginTop: 16 }}>{t('back_home')}</Button>
    </div>
  )

  const services = (salon as any).services || []
  const days = getBookingDays()
  const slots = getTimeSlots()

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitBooking(salon.id, user?.id || '')
      navigate('/')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: 'var(--pad)' }}>
      <Helmet>
        <title>Termin buchen | ChairMatch</title>
        <meta name="description" content="Buche deinen Termin in wenigen Schritten." />
        <link rel="canonical" href={`https://chairmatch.de/booking/${salonId}`} />
      </Helmet>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} style={{ color: 'var(--cream)', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }} aria-label={t('back')}>←</button>
        <div style={{ flex: 1 }}>
          <div className="cinzel" style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{t('book_appointment')}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{salon.name}</div>
        </div>
      </div>
      <ProgressBar value={step} max={4} />
      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 4, marginBottom: 20 }}>{t('step')} {step}/4</div>

      {step === 1 && (
        <div>
          <div className="lgold" style={{ marginBottom: 12 }}>{t('select_service')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {services.map((svc: any) => (
              <button
                key={svc.id}
                className={`card ${selectedService?.id === svc.id ? '' : ''}`}
                onClick={() => { setService(svc); setStep(2) }}
                style={{
                  padding: 14, textAlign: 'left', width: '100%', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderColor: selectedService?.id === svc.id ? 'var(--gold)' : undefined,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{svc.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{svc.duration_minutes} Min.</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--gold)' }}>{formatPriceEur(svc.price_cents)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="lgold" style={{ marginBottom: 12 }}>{t('select_date')}</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
            {days.map(d => (
              <button
                key={d.iso}
                onClick={() => setDay(d.iso)}
                style={{
                  padding: '10px 14px', borderRadius: 12, flexShrink: 0, textAlign: 'center',
                  background: selectedDay === d.iso ? 'var(--gold)' : 'var(--c3)',
                  color: selectedDay === d.iso ? '#080706' : 'var(--cream)',
                  fontWeight: 700, fontSize: 'var(--font-sm)',
                  border: selectedDay === d.iso ? 'none' : '1px solid var(--border)',
                }}
              >
                <div>{d.short}</div>
                <div style={{ fontSize: 'var(--font-lg)', marginTop: 2 }}>{d.day}</div>
              </button>
            ))}
          </div>
          <div className="lgold" style={{ marginBottom: 12 }}>{t('select_time')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {slots.map(s => (
              <button
                key={s}
                onClick={() => { setSlot(s); setStep(3) }}
                style={{
                  padding: '10px 0', borderRadius: 10, fontWeight: 600, fontSize: 'var(--font-sm)',
                  background: selectedSlot === s ? 'var(--gold)' : 'var(--c3)',
                  color: selectedSlot === s ? '#080706' : 'var(--cream)',
                  border: selectedSlot === s ? 'none' : '1px solid var(--border)',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="lgold" style={{ marginBottom: 12 }}>{t('your_details')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input label={t('name')} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t('your_name')} />
            <Input label={t('phone')} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder={t('your_phone')} type="tel" />
          </div>
          <Button onClick={() => setStep(4)} style={{ marginTop: 20 }} disabled={!customerName || !customerPhone}>
            {t('continue')}
          </Button>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="lgold" style={{ marginBottom: 12 }}>{t('booking_summary')}</div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--stone)' }}>{t('service')}:</span> <span style={{ fontWeight: 600 }}>{selectedService?.name}</span></div>
            <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--stone)' }}>{t('date')}:</span> <span style={{ fontWeight: 600 }}>{selectedDay}</span></div>
            <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--stone)' }}>{t('time')}:</span> <span style={{ fontWeight: 600 }}>{selectedSlot}</span></div>
            <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--stone)' }}>{t('name')}:</span> <span style={{ fontWeight: 600 }}>{customerName}</span></div>
            <div style={{ marginBottom: 8 }}><span style={{ color: 'var(--stone)' }}>{t('price')}:</span> <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{selectedService ? formatPriceEur(selectedService.price_cents) : ''}</span></div>
          </div>
          <Button onClick={handleSubmit} loading={submitting} style={{ marginTop: 20 }}>
            {t('confirm_booking')}
          </Button>
        </div>
      )}
    </div>
  )
}
