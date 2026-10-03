import { useMe } from '@/queries/use-me'

/**
 * What the signed-in collector may do. Waitlisted accounts (free-tier user cap) can browse and
 * keep a wishlist but cannot add cards, upload or chat. UI convenience only — RLS enforces it.
 */
export function useAccountAccess() {
  const isWaitlisted = useMe().data?.status === 'WAITLISTED'
  // Only the waitlist is gated here; suspension is enforced (and explained) by the server.
  return { isWaitlisted, canCreate: !isWaitlisted }
}
