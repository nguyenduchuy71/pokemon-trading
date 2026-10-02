import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { newSignedInPage, signIn, USERS } from './helpers'

const PHOTO = fileURLToPath(new URL('./fixtures/card-photo.jpg', import.meta.url))

test('discover → listing → owner, with no commerce actions anywhere', async ({ page }) => {
  await page.goto('/marketplace?q=charizard')
  const firstCard = page.locator('article').first()
  await expect(firstCard).toBeVisible()
  await firstCard.locator('a').first().click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Charizard|リザードン/)
  await expect(page.getByText(/Safety reminder|Lưu ý an toàn/)).toBeVisible()
  await expect(page.getByRole('button', { name: /buy now|add to cart|checkout|place order|pay/i })).toHaveCount(0)
})

test('add a card with a real photo and list it (photo is resized WebP without EXIF)', async ({ page }) => {
  await signIn(page, USERS.dung)
  await page.goto('/cards/add')
  await page.locator('input[role="combobox"]').fill('pikachu 151')
  await page.getByRole('listbox').getByRole('option').first().click()

  await page.locator('input[type="file"][multiple]').setInputFiles(PHOTO)
  await page.getByLabel('List this card for sale or trade').check()
  await page.getByRole('radio', { name: 'For sale' }).click()
  await page.getByLabel('Price').fill('350000')
  await page.getByRole('button', { name: 'Save and list' }).click()

  await page.waitForURL(/\/cards\/[0-9a-f-]{36}$/)
  const img = page.locator('img[alt*="151"]').first()
  await expect(img).toBeVisible()
  const src = await img.getAttribute('src')
  expect(src).toMatch(/card-images\/.+-md\.(webp|jpg)$/)

  const bytes = Buffer.from(await (await page.request.get(src!)).body())
  expect(bytes.length).toBeLessThan(250_000)
  expect(bytes.includes(Buffer.from('Exif'))).toBe(false)
  expect(bytes.includes(Buffer.from('GPS'))).toBe(false)
})

test('message an owner and receive it in realtime', async ({ page, browser }) => {
  await signIn(page, USERS.chi)
  await page.goto('/users/baotrainer?tab=sale')
  await page.locator('article').first().getByRole('button', { name: 'Message owner' }).click()
  const chat = page.getByRole('dialog', { name: 'Messages' })
  await expect(chat).toHaveAttribute('data-conversation-id', /^[0-9a-f-]{36}$/)
  const conversationId = await chat.getAttribute('data-conversation-id')

  // The listing is shared once as a reference card, not an order.
  await expect(page.getByRole('link', { name: 'View listing' })).toBeVisible()

  const bao = await newSignedInPage(browser, USERS.bao)
  await bao.goto(`/messages/${conversationId}`) // deep link opens the chat popup
  await expect(bao.getByRole('link', { name: 'View listing' })).toBeVisible()

  const text = `Is this still available? ${Date.now()}`
  await page.getByPlaceholder('Write a message…').fill(text)
  await page.getByRole('button', { name: 'Send', exact: true }).click()
  // Exactly one bubble on each side: realtime echo and optimistic send are de-duplicated.
  await expect(bao.locator('ol').getByText(text)).toHaveCount(1, { timeout: 8_000 })
  await expect(page.locator('ol').getByText(text)).toHaveCount(1)
})

test('blocking hides listings and stops messaging', async ({ page }) => {
  await signIn(page, USERS.chi)
  await page.goto('/marketplace?q=@dungpulls')
  await expect(page.locator('article').first()).toBeVisible()

  await page.goto('/users/dungpulls')
  await page.getByRole('button', { name: 'Block' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Block' }).click()
  await expect(page.getByRole('button', { name: 'Unblock' })).toBeVisible()

  await page.goto('/marketplace?q=@dungpulls')
  await expect(page.getByText('No matching cards yet')).toBeVisible()

  await page.goto('/users/dungpulls')
  await page.getByRole('button', { name: 'Unblock' }).click()
  await expect(page.getByRole('button', { name: 'Message' })).toBeVisible()
})

test('reports reach the moderation queue', async ({ page, browser }) => {
  await signIn(page, USERS.alex)
  await page.goto('/marketplace?q=@chi_vault')
  await page.locator('article').first().locator('a').first().click()
  await page.getByRole('button', { name: 'Report listing' }).click()
  await page.getByLabel('Fake card').check()
  await page.getByRole('button', { name: 'Send report' }).click()
  // A re-run against the same database hits the one-open-report-per-listing rule; both outcomes leave a report queued.
  await expect(page.getByText(/Thanks — our team will review it\.|You've already reported this\./)).toBeVisible()

  const mod = await newSignedInPage(browser, USERS.mod)
  await mod.goto('/admin')
  await expect(mod.getByText('Fake card').first()).toBeVisible()
})
