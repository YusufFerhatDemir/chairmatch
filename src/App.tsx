import React, { Suspense, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { NavBar } from '@/components/layout/NavBar'
import { Screen } from '@/components/layout/Screen'
import { ConsentBanner } from '@/components/layout/ConsentBanner'
import { Toast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/stores/authStore'
import { useStore } from '@/stores/salonStore'
import { Onboarding, useOnboarding } from '@/components/Onboarding'
import { HomePage } from '@/views/HomePage'
import './index.css'

// Lazy-loaded page components (code-splitting)
const ExplorePage = React.lazy(() =>
  import('@/views/ExplorePage').then(m => ({ default: m.ExplorePage }))
)
const FavoritesPage = React.lazy(() =>
  import('@/views/FavoritesPage').then(m => ({ default: m.FavoritesPage }))
)
const OffersPage = React.lazy(() =>
  import('@/views/OffersPage').then(m => ({ default: m.OffersPage }))
)
const AccountPage = React.lazy(() =>
  import('@/views/AccountPage').then(m => ({ default: m.AccountPage }))
)
const SalonDetailPage = React.lazy(() =>
  import('@/views/SalonDetailPage').then(m => ({ default: m.SalonDetailPage }))
)
const BookingPage = React.lazy(() =>
  import('@/views/BookingPage').then(m => ({ default: m.BookingPage }))
)
const AuthPage = React.lazy(() =>
  import('@/views/AuthPage').then(m => ({ default: m.AuthPage }))
)
const SearchPage = React.lazy(() =>
  import('@/views/SearchPage').then(m => ({ default: m.SearchPage }))
)
const CategoryPage = React.lazy(() =>
  import('@/views/CategoryPage').then(m => ({ default: m.CategoryPage }))
)
const RentalsPage = React.lazy(() =>
  import('@/views/RentalsPage').then(m => ({ default: m.RentalsPage }))
)
const PrivacyPage = React.lazy(() =>
  import('@/views/PrivacyPage').then(m => ({ default: m.PrivacyPage }))
)
const ImpressumPage = React.lazy(() =>
  import('@/views/ImpressumPage').then(m => ({ default: m.ImpressumPage }))
)
const ProviderDashboardPage = React.lazy(() =>
  import('@/views/ProviderDashboardPage').then(m => ({ default: m.ProviderDashboardPage }))
)
const NotFoundPage = React.lazy(() =>
  import('@/views/NotFoundPage').then(m => ({ default: m.NotFoundPage }))
)

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 16,
        minHeight: '60vh',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(200, 168, 75, 0.2)',
          borderTopColor: '#c8a84b',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Skeleton width="60%" height={24} borderRadius={8} />
        <Skeleton width="100%" height={16} borderRadius={6} />
        <Skeleton width="80%" height={16} borderRadius={6} />
      </div>
    </div>
  )
}

export default function App() {
  const initAuth = useAuthStore(s => s.initAuth)
  const loadSalons = useStore(s => s.loadSalons)
  const { done: onboarded, finish: finishOnboarding } = useOnboarding()

  useEffect(() => {
    initAuth()
    loadSalons()
  }, [initAuth, loadSalons])

  if (!onboarded) {
    return <Onboarding onFinish={finishOnboarding} />
  }

  return (
    <Shell>
      <Screen>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/salon/:slug" element={<SalonDetailPage />} />
            <Route path="/booking/:salonId" element={<BookingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/category/:categoryId" element={<CategoryPage />} />
            <Route path="/rentals" element={<RentalsPage />} />
            <Route path="/datenschutz" element={<PrivacyPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/provider" element={<ProviderDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Screen>
      <NavBar />
      <Toast />
      <ConsentBanner />
    </Shell>
  )
}
