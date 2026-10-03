import { Suspense, useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { FullPageSpinner } from '@/components/layout/full-page-spinner'
import { ChatWidget } from '@/components/chat/chat-widget'
import { WaitlistBanner } from '@/components/layout/waitlist-banner'
import { useAccountAccess } from '@/hooks/use-account-access'
import { useChatWidget } from '@/stores/chat-widget-store'

export function AppLayout() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const { canCreate } = useAccountAccess()

  // Signing out (or switching account) must not leave someone else's thread open.
  useEffect(() => {
    if (!session) useChatWidget.setState({ open: false, conversationId: null })
  }, [session])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brass focus:px-4 focus:py-2 focus:text-on-brass">
        {t('app.skip_to_content')}
      </a>
      <SiteHeader />
      {session && <WaitlistBanner />}
      <main id="main" className="flex-1">
        <Suspense fallback={<FullPageSpinner />}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
      {session && <MobileTabBar />}
      {session && canCreate && <ChatWidget />}
      <ScrollRestoration />
    </div>
  )
}
