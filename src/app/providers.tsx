import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/lib/i18n'
import { queryClient } from '@/lib/query-client'
import { resolveTheme, useUiPreferences } from '@/stores/ui-preferences-store'
import { startAuthListener } from '@/stores/auth-store'
import { useInboxRealtime } from '@/queries/use-inbox'
import { Toaster } from '@/components/ui/toast'

startAuthListener()

/** Applies theme + <html lang> from preferences, following the OS when theme = system. */
function ThemeSync() {
  const theme = useUiPreferences((s) => s.theme)
  const locale = useUiPreferences((s) => s.locale)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = resolveTheme(theme, media.matches)
      document.documentElement.dataset.theme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#12100d' : '#f3ede1')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}

function RealtimeBridge() {
  useInboxRealtime()
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeSync />
        <RealtimeBridge />
        {children}
        <Toaster />
      </I18nextProvider>
    </QueryClientProvider>
  )
}
