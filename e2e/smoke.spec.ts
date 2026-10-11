import { expect, test } from '@playwright/test'

test('a visitor without a session lands on the sign-in page', async ({ page }) => {
  await page.goto('/admin')

  // Remembering where they were headed, for after sign-in.
  await expect(page).toHaveURL(/\/login\?redirect=%2Fadmin$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
