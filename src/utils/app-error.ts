/*
 * Maps PostgREST / Postgres errors raised by our RLS, triggers and RPCs to stable
 * i18n keys, so UI never shows raw database messages.
 */
export type AppErrorCode =
  | 'rate_limited'
  | 'blocked'
  | 'suspended'
  | 'photo_required'
  | 'duplicate'
  | 'forbidden'
  | 'not_found'
  | 'unknown'

export class AppError extends Error {
  readonly code: AppErrorCode
  constructor(code: AppErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = 'AppError'
  }
}

interface PgLikeError {
  code?: string
  message?: string
  hint?: string | null
}

const MESSAGE_CODES: AppErrorCode[] = ['rate_limited', 'blocked', 'suspended', 'photo_required']

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const e = (error ?? {}) as PgLikeError
  const message = e.message ?? ''
  const fromMessage = MESSAGE_CODES.find((code) => message.includes(code))
  if (fromMessage) return new AppError(fromMessage, message)
  if (e.code === '23505') return new AppError('duplicate', message)
  if (e.code === '42501') return new AppError('forbidden', message)
  if (e.code === 'PGRST116') return new AppError('not_found', message)
  return new AppError('unknown', message || 'Unexpected error')
}

/** Unwrap a supabase-js `{ data, error }` result, throwing a mapped AppError. */
export function unwrap<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw toAppError(result.error)
  if (result.data == null) throw new AppError('not_found')
  return result.data as NonNullable<T>
}

/** Same as unwrap but tolerates null data (e.g. void RPCs, maybeSingle). */
export function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw toAppError(result.error)
  return result.data
}

/** i18n key under `common:errors.*` for an error. */
export function errorKey(error: unknown): string {
  const { code } = toAppError(error)
  return code === 'unknown' || code === 'not_found' || code === 'forbidden' ? 'errors.generic_body' : `errors.${code}`
}
