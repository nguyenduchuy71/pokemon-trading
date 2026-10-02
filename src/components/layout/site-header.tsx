import { NavLink, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useMe } from '@/queries/use-me'
import { Avatar } from '@/components/ui/avatar'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { Wordmark } from './wordmark'
import { PreferenceControls } from './preference-controls'

const NAV = [
  { to: '/marketplace', key: 'nav.marketplace' },
  { to: '/collection', key: 'nav.collection' },
  { to: '/wishlist', key: 'nav.wishlist' },
] as const

export function SiteHeader() {
  const { t } = useTranslation()
  const session = useAuthStore((s) => s.session)
  const me = useMe()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    navigate(q.trim() ? `/marketplace?q=${encodeURIComponent(q.trim())}` : '/marketplace')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 md:px-8">
        <Wordmark to={session ? '/dashboard' : '/'} />

        <nav aria-label={t('nav.main')} className="hidden items-center gap-5 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn('text-sm transition-colors', isActive ? 'text-ink' : 'text-ink-muted hover:text-ink')}
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={submit} role="search" className="ml-auto hidden max-w-sm flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">{t('marketplace:search_placeholder')}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('marketplace:search_placeholder')}
              className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm placeholder:text-ink-faint focus:border-brass focus:outline-none"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          <PreferenceControls className="hidden sm:flex" />
          {session ? (
            <>
              <span className="hidden md:block">
                <ButtonLink to="/cards/add" size="sm">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('nav.add_card')}
                </ButtonLink>
              </span>
              <NavLink to="/profile" aria-label={t('nav.profile')} className="hidden md:block">
                <Avatar src={me.data?.avatar_url} name={me.data?.username ?? '?'} size={34} />
              </NavLink>
            </>
          ) : (
            <ButtonLink to="/login" variant="secondary" size="sm">
              {t('nav.sign_in')}
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  )
}
