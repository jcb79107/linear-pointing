import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { SessionSnapshot, TeamDefaults } from "../../src/lib/domain";
import { DEFAULT_TEAM_DEFAULTS } from "../../src/lib/team-defaults";
const fixture = "http://127.0.0.1:3005";
function snapshot(
  options: TeamDefaults = DEFAULT_TEAM_DEFAULTS,
): SessionSnapshot {
  return {
    id: "demo-session",
    code: "DEMO2026",
    title: "Platform pointing",
    status: "draft",
    startedAt: null,
    endedAt: null,
    activeStartedAt: null,
    elapsedSeconds: 0,
    teamId: "demo-team",
    teamName: "Platform API",
    scaleType: "linear",
    estimateCards: [0, 1, 2, 3, 4].map((value) => ({
      value,
      label: `${value}`,
    })),
    currentUserId: "u4",
    currentUserRole: "facilitator",
    activeItemId: null,
    participants: [],
    round: null,
    defaults: options,
    autoReveal: options.autoReveal,
    intake: {
      cycleOffset: options.cycleOffset,
      cycleId: "cycle-20",
      name: "Cycle 20",
      startsAt: "2026-10-01T00:00:00Z",
      endsAt: "2026-10-15T00:00:00Z",
    },
    queue: [1, 2, 3].map((n, position) => ({
      id: `00000000-0000-4000-8000-00000000000${n}`,
      linearIssueId: `issue-${n}`,
      identifier: `API-${n}`,
      title: [
        "Retry webhook deliveries",
        "Workspace usage limits",
        "Audit export",
      ][position],
      description: "Ready to point",
      url: "https://linear.app",
      priorityLabel: "High",
      priority: n,
      linearSortOrder: n,
      stateName: "Todo",
      assigneeName: null,
      projectName: null,
      labels: [],
      subIssues: [],
      attachments: [],
      position,
      status: "pending",
      currentEstimate: null,
      finalEstimate: null,
      groomingOutcome: null,
      groomingNote: null,
      decidedAt: null,
      activeStartedAt: null,
      elapsedSeconds: 0,
      linearCreatedAt: null,
      linearUpdatedAt: null,
      dueDate: null,
    })),
  };
}

test("cycle preview loads, reorders with keyboard, removes, and preserves edits after failure", async ({
  page,
}, testInfo) => {
  let current = snapshot();
  let failLoad = false;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/intake")) {
      if (failLoad)
        return route.fulfill({
          status: 503,
          json: { error: "Linear is unavailable. Try again." },
        });
      current = snapshot(request.postDataJSON());
      return route.fulfill({ json: { snapshot: current } });
    }
    if (url.pathname.endsWith("/queue") && request.method() === "PATCH") {
      const ids: string[] = request.postDataJSON().orderedItemIds;
      current.queue = ids.map((id, position) => ({
        ...current.queue.find((item) => item.id === id)!,
        position,
      }));
      return route.fulfill({ json: { success: true } });
    }
    if (url.pathname.endsWith("/queue") && request.method() === "DELETE") {
      current.queue = current.queue.filter(
        (item) => item.id !== url.searchParams.get("itemId"),
      );
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith("/snapshot"))
      return route.fulfill({ json: { snapshot: current } });
    return route.fulfill({
      status: 503,
      json: { error: "Fixture: external integrations disabled" },
    });
  });
  await page.goto(fixture);
  await expect(page.getByLabel("Default cycle")).toHaveValue("1");
  await expect(
    page.getByRole("button", { name: "Start session" }),
  ).toBeDisabled();
  await page.getByLabel("Default cycle").selectOption("2");
  await page.getByRole("button", { name: "Load agenda", exact: true }).click();
  await expect(page.getByText("Cycle 20", { exact: true })).toBeVisible();
  await expect(page.locator(".queue-edit-row")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Move API-2 up", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".queue-edit-row").first()).toContainText("API-2");
  await expect(page.locator(".prepare-save-status")).toContainText(
    "Agenda order saved",
  );
  await page.getByRole("button", { name: "Remove API-1", exact: true }).click();
  await expect(page.locator(".queue-edit-row")).toHaveCount(2);
  await page.screenshot({ path: `docs/pilot/cycle-workflow/agenda-${testInfo.project.name}.png`, fullPage: true });
  failLoad = true;
  await page
    .getByRole("button", { name: "Reload agenda", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reload agenda", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Linear is unavailable",
  );
  await expect(page.locator(".queue-edit-row")).toHaveCount(2);
  await expect(page.locator(".queue-edit-row").first()).toContainText("API-2");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("missing cycle and empty agenda explain how to recover", async ({
  page,
}) => {
  let empty = false;
  await page.route("**/api/**", (route) => {
    if (!empty)
      return route.fulfill({
        status: 422,
        json: {
          error:
            "The cycle 3 cycles ahead does not exist yet. Choose another cycle or use the backlog.",
        },
      });
    return route.fulfill({ json: { snapshot: { ...snapshot(), queue: [] } } });
  });
  await page.goto(fixture);
  await page.getByLabel("Default cycle").selectOption("3");
  await page.getByRole("button", { name: "Load agenda", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "does not exist yet",
  );
  await expect(page.getByLabel("Default cycle")).toHaveValue("3");
  empty = true;
  await page.getByLabel("Default cycle").selectOption("1");
  await page.getByRole("button", { name: "Load agenda", exact: true }).click();
  await expect(
    page.getByText("No tickets to point", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start session" }),
  ).toBeDisabled();
});

test("team settings preserve edits on errors and clearly save per team", async ({
  page,
}, testInfo) => {
  let failSave = true;
  const writes: string[] = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    if (request.url().includes("/defaults")) {
      if (failSave)
        return route.fulfill({
          status: 503,
          json: { error: "Could not save. Try again." },
        });
      writes.push(new URL(request.url()).pathname);
      return route.fulfill({ json: { settings: request.postDataJSON() } });
    }
    return route.fulfill({ json: { connection: null, oauthAvailable: false } });
  });
  await page.goto(`${fixture}/?screen=settings`);
  await expect(
    page.getByRole("link", { name: "Enable estimate saving", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Default cycle").selectOption("3");
  await page
    .getByLabel("Facilitator votes", { exact: true })
    .selectOption("yes");
  await page.getByRole("button", { name: "Save team defaults" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Could not save",
  );
  await expect(page.getByLabel("Default cycle")).toHaveValue("3");
  await page.getByLabel("Linear team", { exact: true }).selectOption("team-b");
  await expect(page.getByLabel("Default cycle")).toHaveValue("1");
  await page.getByLabel("Linear team", { exact: true }).selectOption("team-a");
  await expect(page.getByLabel("Default cycle")).toHaveValue("3");
  await page.getByRole("link", { name: "Sessions", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Leave without saving?");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  failSave = false;
  await page.getByRole("button", { name: "Save team defaults" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Defaults saved for Platform API",
  );
  await page.screenshot({ path: `docs/pilot/cycle-workflow/settings-${testInfo.project.name}.png`, fullPage: true });
  expect(writes).toEqual(["/api/teams/team-a/defaults"]);
  await expect(
    page.getByRole("button", { name: "Save team defaults" }),
  ).toBeDisabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
