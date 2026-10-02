import { formatCardNumber, formatMoney, toIntlLocale } from './format'

describe('formatMoney', () => {
  it('formats VND without decimals in Vietnamese locale', () => {
    expect(formatMoney(4500000, 'VND', 'vi')).toMatch(/4\.500\.000\s?₫/)
  })
  it('formats USD with cents only when present', () => {
    expect(formatMoney(185, 'USD', 'en')).toBe('$185')
    expect(formatMoney(185.5, 'USD', 'en')).toBe('$185.50')
  })
})

describe('formatCardNumber', () => {
  it('includes printed total when known', () => {
    expect(formatCardNumber('199', 165)).toBe('#199/165')
    expect(formatCardNumber('TG05', null)).toBe('#TG05')
  })
})

describe('toIntlLocale', () => {
  it('maps app locales and falls back to vi-VN', () => {
    expect(toIntlLocale('en')).toBe('en-US')
    expect(toIntlLocale('fr')).toBe('vi-VN')
  })
})
