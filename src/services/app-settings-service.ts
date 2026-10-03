import { supabase } from '@/lib/supabase-client'
import { check } from '@/utils/app-error'
import { APP_SETTING_KEYS, DEFAULT_APP_LIMITS, type AppLimits } from '@/constants/free-tier-limits'

export async function getAppLimits(): Promise<AppLimits> {
  const rows = check(await supabase.from('app_settings').select('key, value')) ?? []
  const byKey = new Map(rows.map((r) => [r.key, r.value]))
  const entries = Object.entries(APP_SETTING_KEYS).map(([field, key]) => [field, byKey.get(key) ?? DEFAULT_APP_LIMITS[field as keyof AppLimits]])
  return Object.fromEntries(entries) as AppLimits
}
