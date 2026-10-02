import { expect, test } from '@playwright/test'
import { signIn, USERS } from './helpers'

test('mobile: 2-column grid, filter sheet, full-screen chat', async ({ page }) => {
  await signIn(page, USERS.bao)
  await page.goto('/marketplace')
  const cards = page.locator('article')
  await expect(cards.first()).toBeVisible()
  const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()]
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(4) // side by side

  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  await page.getByRole('button', { name: 'Show results' }).click()

  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Messages' }).click()
  const chat = page.getByRole('dialog', { name: 'Messages' })
  await chat.locator('ul button').first().click()
  await expect(chat.getByPlaceholder('Write a message…')).toBeVisible()
  // The popup covers the whole phone screen, tab bar included.
  const box = await chat.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.width).toBe(viewport.width)
  expect(box!.height).toBe(viewport.height)
})
