import { z } from 'zod'
import { VN_CITIES } from '@/constants/vn-cities'
import { CURRENCIES } from '@/constants/domain'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, { message: 'username_invalid' })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()

export const onboardingSchema = z.object({
  username: usernameSchema,
  display_name: optionalText(50),
  location_city: z.enum(VN_CITIES, { message: 'city_required' }),
  preferred_locale: z.enum(['vi', 'en']),
  preferred_currency: z.enum(CURRENCIES),
  accept_terms: z.literal(true, { message: 'terms_required' }),
})
export type OnboardingInput = z.input<typeof onboardingSchema>
export type OnboardingValues = z.output<typeof onboardingSchema>

export const profileEditSchema = z.object({
  username: usernameSchema,
  display_name: optionalText(50),
  bio: optionalText(500),
  location_city: z.enum(VN_CITIES),
})
export type ProfileEditInput = z.input<typeof profileEditSchema>
export type ProfileEditValues = z.output<typeof profileEditSchema>
