/*
 * Domain enums mirrored from Postgres enums (supabase/migrations/0001_extensions_enums.sql).
 * Keep in sync — src/constants/domain.test.ts compares against the generated DB types.
 */

export const CARD_CONDITIONS = ['MINT', 'NEAR_MINT', 'EXCELLENT', 'LIGHT_PLAYED', 'PLAYED', 'POOR'] as const
export type CardCondition = (typeof CARD_CONDITIONS)[number]

export const LISTING_TYPES = ['SALE', 'TRADE', 'SALE_OR_TRADE'] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const CURRENCIES = ['VND', 'USD'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

export const WISHLIST_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
export type WishlistPriority = (typeof WISHLIST_PRIORITIES)[number]

export const CATALOG_LANGUAGES = ['en', 'ja'] as const
export type CatalogLanguage = (typeof CATALOG_LANGUAGES)[number]

export const PRINTINGS = ['normal', 'holo', 'reverse', 'firstEdition'] as const
export type Printing = (typeof PRINTINGS)[number]

export const GRADING_COMPANIES = ['PSA', 'BGS', 'CGC', 'ACE', 'OTHER'] as const

export const USER_REPORT_REASONS = [
  'SCAM_SUSPICION',
  'HARASSMENT',
  'SPAM',
  'FAKE_LISTING',
  'MISLEADING_CONDITION',
  'PROHIBITED_CONTENT',
  'OTHER',
] as const

export const LISTING_REPORT_REASONS = ['FAKE_CARD', 'WRONG_PRICE', 'WRONG_CARD_INFO', 'MISLEADING_PHOTOS', 'SPAM', 'OTHER'] as const

export type ReportReason = (typeof USER_REPORT_REASONS)[number] | (typeof LISTING_REPORT_REASONS)[number]

/** Rarities that get the holo foil hover treatment. */
export const FOIL_RARITY_PATTERN = /(special illustration|illustration rare|hyper|ultra|secret|super rare|ace spec|SAR|SR|UR|HR|CHR|AR)/i
