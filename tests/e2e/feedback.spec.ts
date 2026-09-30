import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('feedback explains attachments, preserves drafts, and sends nothing on cancel', async ({ page }) => {
  let reports = 0;
  await page.route('**/*.ingest.us.sentry.io/**', route => { reports++; return route.fulfill({ status: 200, json: {} }); });
  await page.goto('/demo');
  const trigger = page.getByRole('button', { name: 'Send feedback', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('up to the last minute');
  await expect(dialog).toContainText('visible tickets');
  await dialog.getByLabel('What happened, or what would you change?').fill('The queue jumps when I move a ticket.');
  await dialog.getByLabel('Screenshot').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(dialog.getByRole('alert')).toContainText('Choose a PNG');
  await dialog.getByLabel('Screenshot').setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=', 'base64') });
  await expect(dialog.getByRole('button', { name: 'Remove screenshot' })).toBeVisible();
  expect((await new AxeBuilder({ page }).include('.feedback-dialog').analyze()).violations).toEqual([]);
  expect(await dialog.evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(reports).toBe(0);
  await trigger.click();
  await expect(dialog.getByLabel('What happened, or what would you change?')).toHaveValue('The queue jumps when I move a ticket.');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
