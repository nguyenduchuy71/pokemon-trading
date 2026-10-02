import { resolveTheme, useUiPreferences } from './ui-preferences-store'

describe('ui preferences', () => {
  it('resolves system theme from media preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })
  it('persists choices to localStorage', () => {
    useUiPreferences.getState().setCurrency('USD')
    expect(JSON.parse(localStorage.getItem('cardswap.preferences')!).state.currency).toBe('USD')
  })
})
