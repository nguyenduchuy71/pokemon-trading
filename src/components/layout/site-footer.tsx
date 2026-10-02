import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PreferenceControls } from './preference-controls'
import { Wordmark } from './wordmark'

const LINKS = [
  { to: '/legal/terms', key: 'footer.terms' },
  { to: '/legal/privacy', key: 'footer.privacy' },
  { to: '/legal/community-guidelines', key: 'footer.guidelines' },
  { to: '/legal/prohibited-items', key: 'footer.prohibited' },
  { to: '/legal/safety', key: 'footer.safety' },
] as const

export const CONTACT_EMAIL = 'wtfomg3650@gmail.com'

export function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer className="mt-24 border-t border-line pb-24 md:pb-0">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div className="max-w-xl">
          <Wordmark />
          <p className="mt-3 text-xs leading-relaxed text-ink-faint">{t('footer.disclaimer')}</p>
          <p className="mt-2 text-xs text-ink-faint">{t('footer.catalog_credit')}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-ink">
                {t(l.key)}
              </Link>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-ink">
              {t('footer.contact')}
            </a>
          </nav>
          <PreferenceControls className="sm:hidden" />
        </div>
      </div>
    </footer>
  )
}
