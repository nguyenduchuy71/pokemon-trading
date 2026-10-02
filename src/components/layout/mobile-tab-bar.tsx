import { NavLink } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Compass, Layers, MessageCircle, Plus, UserRound } from 'lucide-react'
import { useUnreadCount } from '@/queries/use-inbox'
import { useChatWidget } from '@/stores/chat-widget-store'
import { cn } from '@/utils/cn'

/** Bottom navigation for phones; the centre "+" is the primary collector action. */
export function MobileTabBar() {
  const { t } = useTranslation()
  const unread = useUnreadCount()
  const { open: chatOpen, openInbox } = useChatWidget()
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px]', isActive ? 'text-brass' : 'text-ink-faint')

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <NavLink to="/marketplace" className={tab}>
        <Compass className="h-5 w-5" aria-hidden />
        {t('nav.marketplace')}
      </NavLink>
      <NavLink to="/collection" className={tab}>
        <Layers className="h-5 w-5" aria-hidden />
        {t('nav.collection')}
      </NavLink>
      <NavLink to="/cards/add" className="flex flex-1 items-center justify-center" aria-label={t('nav.add_card')}>
        <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brass text-on-brass shadow-lg shadow-black/40">
          <Plus className="h-6 w-6" aria-hidden />
        </span>
      </NavLink>
      <button type="button" onClick={openInbox} className={tab({ isActive: chatOpen })}>
        <span className="relative">
          <MessageCircle className="h-5 w-5" aria-hidden />
          {unread > 0 && (
            <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-brass px-1 text-center font-mono text-[9px] leading-4 text-on-brass">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </span>
        {t('nav.messages')}
      </button>
      <NavLink to="/profile" className={tab}>
        <UserRound className="h-5 w-5" aria-hidden />
        {t('nav.me')}
      </NavLink>
    </nav>
  )
}
