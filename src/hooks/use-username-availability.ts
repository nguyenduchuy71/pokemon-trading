import { useEffect, useState } from 'react'
import { isUsernameAvailable } from '@/services/profile-service'
import { USERNAME_PATTERN } from '@/schemas/profile-schema'

type Availability = 'idle' | 'checking' | 'available' | 'taken'

/** Debounced server check; only runs for syntactically valid usernames. */
export function useUsernameAvailability(username: string, current?: string): Availability {
  const [state, setState] = useState<Availability>('idle')

  useEffect(() => {
    const value = username.trim().toLowerCase()
    if (!USERNAME_PATTERN.test(value) || value === current) {
      setState('idle')
      return
    }
    setState('checking')
    let cancelled = false
    const id = setTimeout(() => {
      isUsernameAvailable(value)
        .then((ok) => !cancelled && setState(ok ? 'available' : 'taken'))
        .catch(() => !cancelled && setState('idle'))
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [username, current])

  return state
}
