import { lazy, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router'
import { AppLayout } from '@/layouts/app-layout'
import { RedirectIfSignedIn, RequireAdmin, RequireAuth } from '@/components/auth/route-guards'

/*
 * v1 routes. Intentionally absent: /orders /checkout /payment /shipping /trades (out of scope), [scope-guard: allow]
 * and /notifications /favorites (planned for v1.1).
 */
const LandingPage = lazy(() => import('@/pages/landing-page'))
const LoginPage = lazy(() => import('@/pages/login-page'))
const AuthCallbackPage = lazy(() => import('@/pages/auth-callback-page'))
const OnboardingPage = lazy(() => import('@/pages/onboarding-page'))
const DashboardPage = lazy(() => import('@/pages/dashboard-page'))
const MarketplacePage = lazy(() => import('@/pages/marketplace-page'))
const ListingDetailPage = lazy(() => import('@/pages/listing-detail-page'))
const AddCardPage = lazy(() => import('@/pages/add-card-page'))
const CollectionPage = lazy(() => import('@/pages/collection-page'))
const BinderPage = lazy(() => import('@/pages/binder-page'))
const WishlistPage = lazy(() => import('@/pages/wishlist-page'))
const MessagesPage = lazy(() => import('@/pages/messages-page'))
const PublicProfilePage = lazy(() => import('@/pages/public-profile-page'))
const ProfilePage = lazy(() => import('@/pages/profile-page'))
const SettingsPage = lazy(() => import('@/pages/settings-page'))
const AdminPage = lazy(() => import('@/pages/admin-page'))
const LegalPage = lazy(() => import('@/pages/legal-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))

const authed = (node: ReactNode) => <RequireAuth>{node}</RequireAuth>

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <RedirectIfSignedIn><LandingPage /></RedirectIfSignedIn> },
      { path: '/login', element: <RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn> },
      { path: '/register', element: <RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/onboarding', element: authed(<OnboardingPage />) },
      { path: '/dashboard', element: authed(<DashboardPage />) },
      { path: '/marketplace', element: <MarketplacePage /> },
      { path: '/cards/add', element: authed(<AddCardPage />) },
      { path: '/cards/:id', element: <ListingDetailPage /> },
      { path: '/collection', element: authed(<CollectionPage />) },
      { path: '/collection/:id', element: authed(<BinderPage />) },
      { path: '/wishlist', element: authed(<WishlistPage />) },
      { path: '/messages', element: authed(<MessagesPage />) },
      { path: '/messages/:id', element: authed(<MessagesPage />) },
      { path: '/users/:username', element: <PublicProfilePage /> },
      { path: '/profile', element: authed(<ProfilePage />) },
      { path: '/settings', element: authed(<SettingsPage />) },
      { path: '/admin', element: <RequireAdmin><AdminPage /></RequireAdmin> },
      { path: '/legal/:slug', element: <LegalPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
