import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useUiPreferences } from '@/stores/ui-preferences-store'

/*
 * Bundles every locale JSON at build time (small, avoids a network waterfall).
 * Namespace = file name, e.g. locales/vi/marketplace.json → t('marketplace:…').
 */
const modules = import.meta.glob<{ default: Record<string, unknown> }>('../locales/*/*.json', { eager: true })

const resources: Record<string, Record<string, Record<string, unknown>>> = {}
for (const [path, mod] of Object.entries(modules)) {
  const match = path.match(/locales\/(\w+)\/([\w-]+)\.json$/)
  if (!match) continue
  const [, lng, ns] = match
  resources[lng] ??= {}
  resources[lng][ns] = mod.default
}

void i18n.use(initReactI18next).init({
  resources,
  lng: useUiPreferences.getState().locale,
  fallbackLng: 'vi',
  defaultNS: 'common',
  ns: Object.keys(resources.vi ?? {}),
  interpolation: { escapeValue: false },
  returnNull: false,
})

// Keep i18n in sync with the persisted preference.
useUiPreferences.subscribe((state, prev) => {
  if (state.locale !== prev.locale) void i18n.changeLanguage(state.locale)
})

export default i18n
