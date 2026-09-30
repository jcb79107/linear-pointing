import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Demo interactions are local simulations; never submit to authenticated APIs.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'));
});

test('skip the whole queue and show accurate results', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/demo');
  await expect(page.getByRole('button', { name: /^(Needs details|Split|Park)$/ })).toHaveCount(0);
  for (const title of ['Retry failed webhook deliveries', 'Add workspace usage limits', 'Audit log CSV export']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
  }
  await expect(page.locator('.session-summary')).toContainText('0 estimated');
  await expect(page.locator('.summary-list em.skipped')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reveal, revise a round, and save an explicit estimate', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Reveal early' }).click();
  await expect(page.locator('.final-values')).toBeVisible();
  await page.getByRole('button', { name: 'Start another round' }).click();
  await expect(page.getByRole('button', { name: 'Reveal early' })).toBeVisible();
  await expect(page.locator('.final-values')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reveal early' }).click();
  await page.locator('.final-values').getByRole('button', { name: '2', exact: true }).click();
  await expect(page.locator('.final-values').getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save estimate & next' }).click();
  await expect(page.getByRole('heading', { name: 'Add workspace usage limits', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.locator('.summary-list').getByRole('link').first()).toContainText('2');
  await expect(page.locator('.session-summary')).toContainText('1 estimated');
});

test('finish and resume without losing the remaining tickets', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await page.getByRole('button', { name: 'Resume 2 remaining' }).click();
  await expect(page.getByRole('heading', { name: 'Add workspace usage limits', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.locator('.summary-list em.skipped')).toHaveCount(3);
});

test('voter can change a private vote but cannot facilitate', async ({ page }) => {
  await page.goto('/demo?role=voter');
  await expect(page.getByRole('button', { name: /^(Reveal early|Skip|Finish for now)$/ })).toHaveCount(0);
  const first = page.getByRole('button', { name: '1 points, shortcut 2', exact: true });
  const second = page.getByRole('button', { name: '3 points, shortcut 4', exact: true });
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.vote-status.revealed')).toHaveCount(0);
});

test('clipboard failure gives a selectable summary', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')) },
  }));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await page.getByRole('button', { name: 'Copy summary' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not copy' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Session summary to copy' })).toHaveValue(/API-342/);
});

test('landing CTA reaches demo and browser back works', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /try.*demo/i }).click();
  await expect(page).toHaveURL(/\/demo/);
  await expect(page.getByRole('heading', { name: 'Retry failed webhook deliveries', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`demo accessibility and reflow in ${theme} theme`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/demo');
    await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    expect(overflow, 'page must not scroll horizontally').toBe(false);
    await page.screenshot({ path: testInfo.outputPath(`demo-${theme}.png`), fullPage: true });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    await testInfo.attach('accessibility', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
    expect(results.violations).toEqual([]);
  });
}

test('keyboard voting and shortcut help', async ({ page }) => {
  await page.goto('/demo?role=voter');
  const card = page.getByRole('button', { name: '2 points, shortcut 3', exact: true });
  await card.focus();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`other journey states are accessible in ${theme} theme`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const state of ['landing', 'voter', 'revealed', 'summary']) {
      await page.goto(state === 'landing' ? '/' : state === 'voter' ? '/demo?role=voter' : '/demo');
      if (state === 'revealed') await page.getByRole('button', { name: 'Reveal early' }).click();
      if (state === 'summary') {
        await page.getByRole('button', { name: 'Reveal early' }).click();
        await page.locator('.final-values').getByRole('button', { name: '2', exact: true }).click();
        await page.getByRole('button', { name: 'Save estimate & next' }).click();
        await page.getByRole('button', { name: 'Skip', exact: true }).click();
        await page.getByRole('button', { name: 'Finish for now' }).click();
      }
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      await testInfo.attach(`${state}-${theme}`, { body: JSON.stringify(result.violations, null, 2), contentType: 'application/json' });
      expect.soft(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), state).toEqual([]);
    }
  });
}

test('phone header actions remain recognizable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/demo');
  const finish = page.getByRole('button', { name: 'Finish for now' });
  await expect(finish).toBeVisible();
  const icon = await finish.locator('svg').boundingBox();
  expect(icon?.width).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('revealed individual votes remain visible on phones', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Reveal early' }).click();
  const mobile = (page.viewportSize()?.width ?? 0) <= 700;
  const votes = page.locator(mobile ? '.mobile-revealed-votes' : '.participant-list');
  await expect(votes).toBeVisible();
  await expect(votes).toContainText('Richard');
  await expect(votes).toContainText('Dinesh');
  await expect(votes).toContainText('Gilfoyle');
  await expect(page.getByText('Votes range from 1–4. Discuss the difference before choosing.')).toBeVisible();
});

test('participant browses ahead without moving the room or voting on the wrong ticket', async ({ page }) => {
  await page.goto('/demo?role=voter');
  if ((page.viewportSize()?.width ?? 0) <= 1180) await page.getByLabel('Browse agenda').selectOption('q2');
  else await page.getByRole('button', { name: /02 Add workspace usage limits/ }).click();
  await expect(page.getByRole('heading', { name: 'Add workspace usage limits', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '1 points, shortcut 2', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Return to current ticket' }).click();
  await expect(page.getByRole('heading', { name: 'Retry failed webhook deliveries', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '1 points, shortcut 2', exact: true })).toBeEnabled();
});

test('skipped tickets can be revisited from the summary', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.locator('.session-summary-heading')).toContainText('1 skipped');
  await page.getByRole('button', { name: 'Revisit API-342' }).click();
  await expect(page.getByRole('heading', { name: 'Retry failed webhook deliveries', exact: true })).toBeVisible();
});

test('visible role switch opens a complete participant demo', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('navigation', { name: 'Demo role' }).getByRole('link', { name: 'Participant', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reveal early' })).toHaveCount(0);
  await page.getByRole('button', { name: '1 points, shortcut 2', exact: true }).click();
  await page.getByRole('button', { name: 'Show team votes' }).click();
  await expect(page.locator('.vote-dock-head')).toContainText('Votes revealed');
});
