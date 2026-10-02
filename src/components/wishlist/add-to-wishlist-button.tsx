import { useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { BookmarkCheck, BookmarkPlus } from 'lucide-react'
import { useAddToWishlist, useWishlistedCardIds } from '@/queries/use-wishlist'
import { useAuthStore } from '@/stores/auth-store'
import { useUiPreferences } from '@/stores/ui-preferences-store'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { errorKey } from '@/utils/app-error'

interface Props {
  cardId: string
  printing?: string | null
  size?: 'sm' | 'md' | 'icon'
  variant?: 'secondary' | 'ghost'
  className?: string
}

/** Adds the catalog card (not the listing) to the viewer's wantlist. */
export function AddToWishlistButton({ cardId, printing, size = 'md', variant = 'secondary', className }: Props) {
  const { t } = useTranslation()
  const { t: tw } = useTranslation('wishlist')
  const session = useAuthStore((s) => s.session)
  const navigate = useNavigate()
  const location = useLocation()
  const currency = useUiPreferences((s) => s.currency)
  const wishlisted = useWishlistedCardIds().has(cardId)
  const add = useAddToWishlist()

  function onClick() {
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      return
    }
    if (wishlisted) {
      navigate('/wishlist')
      return
    }
    add.mutate(
      { card_id: cardId, printing: printing ?? null, min_condition: 'NEAR_MINT', max_price_currency: currency, priority: 'MEDIUM' },
      {
        onSuccess: () => toast.success(tw('added'), { label: tw('view'), onClick: () => navigate('/wishlist') }),
        onError: (e) => toast.error(t(errorKey(e))),
      },
    )
  }

  const Icon = wishlisted ? BookmarkCheck : BookmarkPlus
  return (
    <Button variant={variant} size={size} onClick={onClick} loading={add.isPending} aria-pressed={wishlisted} className={className} aria-label={size === 'icon' ? t('actions.add_to_wishlist') : undefined}>
      {!add.isPending && <Icon className={wishlisted ? 'h-4 w-4 text-brass' : 'h-4 w-4'} aria-hidden />}
      {size !== 'icon' && (wishlisted ? tw('on_wishlist') : t('actions.add_to_wishlist'))}
    </Button>
  )
}
