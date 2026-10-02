import type { CurrencyCode } from '@/constants/domain'

const INTL_LOCALE: Record<string, string> = { vi: 'vi-VN', en: 'en-US' }

export function toIntlLocale(locale: string): string {
  return INTL_LOCALE[locale.slice(0, 2)] ?? 'vi-VN'
}

/** Format money; VND never shows decimals, USD shows cents only when present. */
export function formatMoney(amount: number, currency: CurrencyCode, locale = 'vi'): string {
  const fractionDigits = currency === 'VND' ? 0 : Number.isInteger(amount) ? 0 : 2
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount)
}

export function formatDate(iso: string, locale = 'vi', opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), opts).format(new Date(iso))
}

export function formatTime(iso: string, locale = 'vi'): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

export function formatYear(iso: string): string {
  return String(new Date(iso).getFullYear())
}

/** "#199/165" style card number; omits total when unknown. */
export function formatCardNumber(cardNumber: string, printedTotal?: number | null): string {
  return printedTotal ? `#${cardNumber}/${printedTotal}` : `#${cardNumber}`
}
