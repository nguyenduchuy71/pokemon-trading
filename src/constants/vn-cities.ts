/*
 * Approximate locations (province/city level only — never street addresses).
 * Mirrored by the check constraint on profiles.location_city; supabase/tests verifies parity.
 */
export const VN_CITIES = [
  'Ho Chi Minh City',
  'Hanoi',
  'Da Nang',
  'Hai Phong',
  'Can Tho',
  'Bien Hoa',
  'Nha Trang',
  'Hue',
  'Vung Tau',
  'Da Lat',
  'Quy Nhon',
  'Buon Ma Thuot',
  'Vinh',
  'Thu Dau Mot',
  'Long Xuyen',
  'Ha Long',
  'Thai Nguyen',
  'Nam Dinh',
  'Other (Vietnam)',
  'Outside Vietnam',
] as const

export type VnCity = (typeof VN_CITIES)[number]
