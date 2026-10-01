import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fixture = "http://127.0.0.1:3005";
const snapshotPath = "**/api/sessions/demo-session/snapshot";
const denied = { error: "Room access ended", code: "ROOM_ACCESS_DENIED" };
const unavailable = { error: "Try again", code: "LINEAR_ACCESS_UNAVAILABLE" };

async function openRoom(page: Page) {
  await page.goto(`${fixture}/?screen=room`);
  await expect(page.locator(".room-shell")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retry failed webhook deliveries", exact: true })).toBeVisible();
}

test("confirmed access denial clears cached room and dialogs and stops polling", async ({ page }) => {
  await page.clock.install();
  await openRoom(page);
  let polls = 0;
  await page.route(snapshotPath, route => {
    polls += 1;
    return route.fulfill({ status: 403, json: denied });
  });
  await page.getByRole("button", { name: "Delete session", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.clock.runFor(5_100);
  const title = page.getByRole("heading", { name: "Room access ended", exact: true });
  await expect(title).toBeVisible();
  await expect(title).toBeFocused();
  await expect(page.locator(".room-shell")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Platform pointing", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Richard Hendricks", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Check access again" })).toHaveAttribute("href", "/sessions/demo-session");
  const pollsAfterDenial = polls;
  await page.clock.runFor(15_000);
  expect(polls).toBe(pollsAfterDenial);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("temporary provider failure keeps cached content and recovers on the next successful check", async ({ page, request }) => {
  const snapshot = (await (await request.get(`${fixture}/api/fixture-snapshot`)).json()).snapshot;
  await page.clock.install();
  await openRoom(page);
  let available = false;
  await page.route(snapshotPath, route => route.fulfill(available
    ? { json: { snapshot } }
    : { status: 503, json: unavailable }));
  await page.clock.runFor(5_100);
  await expect(page.getByRole("status").filter({ hasText: "Linear access is temporarily unavailable" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Retry failed webhook deliveries", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Room access ended" })).toHaveCount(0);
  available = true;
  await page.getByRole("button", { name: "Retry now" }).click();
  await expect(page.locator(".room-sync-status")).toHaveCount(0);
  await expect(page.locator(".room-shell")).toBeVisible();
});

test("role-only action denial preserves the accessible room", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/sessions/demo-session/actions", route =>
    route.fulfill({ status: 403, json: { error: "Not allowed" } }));
  await openRoom(page);
  await page.getByRole("button", { name: "Reveal early", exact: true }).click();
  await expect(page.locator(".room-error")).toHaveText("Not allowed");
  await expect(page.getByRole("heading", { name: "Retry failed webhook deliveries", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Room access ended" })).toHaveCount(0);
});

test("confirmed action denial prevents a late successful poll from restoring the room", async ({ page, request }) => {
  const snapshot = (await (await request.get(`${fixture}/api/fixture-snapshot`)).json()).snapshot;
  await page.clock.install();
  await openRoom(page);
  let releasePoll: (() => Promise<void>) | undefined;
  await page.route(snapshotPath, route => new Promise<void>(resolve => {
    releasePoll = async () => { await route.fulfill({ json: { snapshot } }); resolve(); };
  }));
  await page.route("**/api/sessions/demo-session/actions", route =>
    route.fulfill({ status: 403, json: denied }));
  await page.clock.runFor(5_100);
  await expect.poll(() => Boolean(releasePoll)).toBe(true);
  await page.getByRole("button", { name: "Reveal early", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Room access ended" })).toBeVisible();
  await releasePoll!();
  await page.clock.runFor(1_000);
  await expect(page.locator(".room-shell")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Room access ended" })).toBeVisible();
});

test("expired sign-in clears protected content", async ({ page }) => {
  await page.clock.install();
  await openRoom(page);
  await page.route(snapshotPath, route => route.fulfill({ status: 401, json: { error: "Sign in required" } }));
  await page.clock.runFor(5_100);
  await expect(page.getByRole("heading", { name: "Room access ended" })).toBeVisible();
  await expect(page.locator(".room-shell")).toHaveCount(0);
});
