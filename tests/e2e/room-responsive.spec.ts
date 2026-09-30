import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'));
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 667 }, { width: 677, height: 800 }, { width: 844, height: 390 }]) {
  test(`ticket and revealed controls remain usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/demo');
    await page.getByRole('button', { name: 'Reveal early' }).click();
    const geometry = await page.locator('.room-issue').evaluate(pane => {
      const ticket = pane.querySelector('.issue-scroll')!.getBoundingClientRect();
      const dock = pane.querySelector('.vote-dock')!.getBoundingClientRect();
      const team = document.querySelector('.room-team')!.getBoundingClientRect();
      return { ticketHeight: ticket.height, ticketBottom: ticket.bottom, dockTop: dock.top, dockBottom: dock.bottom, teamTop: team.top, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry.ticketHeight).toBeGreaterThan(240);
    expect(geometry.dockTop).toBeGreaterThanOrEqual(geometry.ticketBottom - 1);
    if (viewport.width <= 700) expect(geometry.teamTop).toBeGreaterThanOrEqual(geometry.dockBottom - 1);
    expect(geometry.overflow).toBeLessThanOrEqual(1);
    await page.locator('.final-values').getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: 'Save estimate & next' }).click();
    await expect(page.getByRole('heading', { name: 'Add workspace usage limits', exact: true })).toBeInViewport();
    await page.getByRole('button', { name: 'Skip', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Audit log CSV export', exact: true })).toBeInViewport();
    // Resize without reloading; desktop must recover its split layout.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.locator('.room-queue')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reveal early' })).toBeInViewport();
  });
}

test('participant can read the full ticket and vote on a short phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/demo?role=voter');
  const ticket = page.locator('.issue-scroll');
  expect(await ticket.evaluate(e => e.clientHeight >= e.scrollHeight - 1)).toBe(true);
  await page.getByRole('button', { name: '3 points, shortcut 4', exact: true }).click();
  await expect(page.getByRole('button', { name: '3 points, shortcut 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('header title and actions fit across tablet and desktop breakpoints', async ({ page }) => {
  await page.goto('/demo');
  for (const width of [700, 701, 900, 904, 1024, 1180, 1181, 1280, 1440]) {
    await page.setViewportSize({ width, height: 954 });
    const layout = await page.locator('.room-header').evaluate(header => {
      const bounds = header.getBoundingClientRect();
      const title = header.querySelector('.room-title')!.getBoundingClientRect();
      const actions = header.querySelector('.room-actions')!.getBoundingClientRect();
      const label = header.querySelector('.room-title b')!;
      const controls = [...header.querySelectorAll('.room-actions button')].filter(e => e.getBoundingClientRect().width > 0);
      return {
        titleFits: label.clientHeight <= parseFloat(getComputedStyle(label).lineHeight) + 1,
        separated: title.right <= actions.left,
        controlsFit: controls.every(e => { const r = e.getBoundingClientRect(); return r.top >= bounds.top && r.bottom <= bounds.bottom && r.right <= bounds.right && e.scrollHeight <= e.clientHeight + 1; }),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(layout, `Header at ${width}px`).toEqual({ titleFits: true, separated: true, controlsFit: true, overflow: 0 });
  }
  await page.setViewportSize({ width: 904, height: 954 });
  await page.getByRole('button', { name: 'Finish for now' }).click();
  await expect(page.getByRole('button', { name: 'Resume 3 remaining' })).toBeVisible();
});
