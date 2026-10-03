/**
 * Free-tier limits. The database (`app_settings`, enforced by triggers/RLS) is authoritative;
 * these mirror the seeded defaults so the UI can render before the settings load.
 */
export const DEFAULT_APP_LIMITS = {
  maxActiveUsers: 100,
  msgTextPerDay: 200,
  msgImagePerDay: 5,
  maxCollectionItems: 20,
  maxPhotosPerItem: 3,
  messageRetentionDays: 7,
}

export type AppLimits = typeof DEFAULT_APP_LIMITS

/** `app_settings.key` for each limit. */
export const APP_SETTING_KEYS: Record<keyof AppLimits, string> = {
  maxActiveUsers: 'max_active_users',
  msgTextPerDay: 'msg_text_per_day',
  msgImagePerDay: 'msg_image_per_day',
  maxCollectionItems: 'max_collection_items',
  maxPhotosPerItem: 'max_photos_per_item',
  messageRetentionDays: 'message_retention_days',
}
