import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CurrencyCode } from '@/constants/domain'

export type ThemePreference = 'dark' | 'light' | 'system'
export type AppLocale = 'vi' | 'en'

interface UiPreferencesState {
  theme: ThemePreference
  locale: AppLocale
  currency: CurrencyCode
  setTheme: (theme: ThemePreference) => void
  setLocale: (locale: AppLocale) => void
  setCurrency: (currency: CurrencyCode) => void
}

/** Per-device display preferences. Mirrored to the profile when signed in (see settings page). */
export const useUiPreferences = create<UiPreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      locale: 'vi',
      currency: 'VND',
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'cardswap.preferences' },
  ),
)

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): 'dark' | 'light' {
  if (pref === 'system') return prefersDark ? 'dark' : 'light'
  return pref
}
