import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { cn } from '@/utils/cn'

/** Compact theme + language + currency toggles for header/footer. */
export function PreferenceControls({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { theme, setTheme, locale, setLocale, currency, setCurrency } = useUiPreferences()
  const isDark = theme !== 'light'
  const pill = 'h-8 rounded-full border border-line px-2.5 font-mono text-[11px] text-ink-muted hover:border-line-strong hover:text-ink'

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button type="button" className={pill} onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} aria-label={t('prefs.language')}>
        {locale === 'vi' ? 'VI' : 'EN'}
      </button>
      <button type="button" className={pill} onClick={() => setCurrency(currency === 'VND' ? 'USD' : 'VND')} aria-label={t('prefs.currency')}>
        {currency === 'VND' ? '₫' : '$'}
      </button>
      <button
        type="button"
        className={cn(pill, 'flex w-8 items-center justify-center px-0')}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`${t('prefs.theme')}: ${isDark ? t('prefs.theme_dark') : t('prefs.theme_light')}`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
