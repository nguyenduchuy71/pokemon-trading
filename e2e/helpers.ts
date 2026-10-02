import type { Browser, Page } from '@playwright/test'

export const PASSWORD = 'cardswap-dev'

/** Seeded collectors (supabase/seeds/02-dev-collectors.sql). */
export const USERS = {
  alex: 'alex@cardswap.dev',
  bao: 'bao@cardswap.dev',
  chi: 'chi@cardswap.dev',
  dung: 'dung@cardswap.dev',
  mod: 'mod@cardswap.dev',
} as const

export async function signIn(page: Page, email: string): Promise<void> {
  // English UI keeps selectors stable regardless of the default (Vietnamese) locale.
  await page.addInitScript(() => {
    if (!localStorage.getItem('cardswap.preferences')) {
      localStorage.setItem('cardswap.preferences', JSON.stringify({ state: { theme: 'dark', locale: 'en', currency: 'VND' }, version: 0 }))
    }
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in with email' }).click()
  await page.waitForURL(/\/dashboard/)
}

export async function newSignedInPage(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await signIn(page, email)
  return page
}
