import { safeNext } from './safe-next'

it('allows internal paths only', () => {
  expect(safeNext('/collection?x=1')).toBe('/collection?x=1')
  expect(safeNext('//evil.com')).toBe('/dashboard')
  expect(safeNext('/\\evil.com')).toBe('/dashboard')
  expect(safeNext('https://evil.com')).toBe('/dashboard')
  expect(safeNext(null)).toBe('/dashboard')
})
