import { AppError, errorKey, toAppError, unwrap } from './app-error'

describe('toAppError', () => {
  it('maps database exceptions raised by triggers/RPCs', () => {
    expect(toAppError({ code: 'P0001', message: 'rate_limited' }).code).toBe('rate_limited')
    expect(toAppError({ code: '42501', message: 'blocked' }).code).toBe('blocked')
    expect(toAppError({ code: '23514', message: 'photo_required' }).code).toBe('photo_required')
  })
  it('maps postgres codes', () => {
    expect(toAppError({ code: '23505', message: 'dup key' }).code).toBe('duplicate')
    expect(toAppError({ code: '42501', message: 'new row violates row-level security policy' }).code).toBe('forbidden')
  })
  it('passes AppError through', () => {
    const e = new AppError('suspended')
    expect(toAppError(e)).toBe(e)
  })
})

describe('unwrap', () => {
  it('returns data or throws mapped errors', () => {
    expect(unwrap({ data: 1, error: null })).toBe(1)
    expect(() => unwrap({ data: null, error: { code: '23505' } })).toThrow(AppError)
    expect(() => unwrap({ data: null, error: null })).toThrow('not_found')
  })
})

describe('errorKey', () => {
  it('uses specific keys for user-actionable errors only', () => {
    expect(errorKey({ message: 'rate_limited' })).toBe('errors.rate_limited')
    expect(errorKey({ message: 'boom' })).toBe('errors.generic_body')
  })
})
