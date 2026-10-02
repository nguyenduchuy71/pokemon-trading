import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { PASSWORD } from './helpers'

/** Reads the local anon key from .env.local (written by the dev setup / CI). */
function localEnv(): { url: string; anonKey: string } {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
  )
  return { url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY }
}

test('new collector is gated into onboarding, then lands on the dashboard', async ({ page, request }) => {
  const { url, anonKey } = localEnv()
  const stamp = Date.now().toString(36)
  const email = `new-${stamp}@cardswap.dev`
  const signup = await request.post(`${url}/auth/v1/signup`, { headers: { apikey: anonKey }, data: { email, password: PASSWORD } })
  expect(signup.ok()).toBe(true)

  await page.addInitScript(() =>
    localStorage.setItem('cardswap.preferences', JSON.stringify({ state: { theme: 'dark', locale: 'en', currency: 'VND' }, version: 0 })),
  )
  await page.goto('/collection')
  await page.waitForURL(/\/login\?next=/)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in with email' }).click()

  await page.waitForURL(/\/onboarding/)
  await page.getByLabel('Username').fill('alexcollector') // taken
  await expect(page.getByText('That username is taken.')).toBeVisible()
  await page.getByLabel('Username').fill(`new_${stamp}`.slice(0, 20))
  await page.getByLabel('City (approximate)').selectOption('Da Nang')
  await page.getByRole('button', { name: 'Enter CardSwap' }).click()
  await expect(page.getByText('You need to agree to continue.')).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Enter CardSwap' }).click()

  await page.waitForURL(/\/dashboard/)
  await expect(page.getByText('Getting started')).toBeVisible()
})
