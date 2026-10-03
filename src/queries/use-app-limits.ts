import { useQuery } from '@tanstack/react-query'
import { getAppLimits } from '@/services/app-settings-service'
import { DEFAULT_APP_LIMITS, type AppLimits } from '@/constants/free-tier-limits'

/** Free-tier limits from `app_settings`; changes only via SQL, so fetched once per session. */
export function useAppLimits(): AppLimits {
  const { data } = useQuery({ queryKey: ['app-limits'], queryFn: getAppLimits, staleTime: Infinity })
  return data ?? DEFAULT_APP_LIMITS
}
