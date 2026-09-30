import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadIntakeIssues, resolveSessionIntake } from "./linear";
const mocks = vi.hoisted(() => ({ issues: vi.fn(), team: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }) } }));
vi.mock("@/lib/crypto", () => ({ decryptSecret: () => "synthetic-token", encryptSecret: vi.fn() }));
vi.mock("@linear/sdk", () => ({ PaginationOrderBy: { UpdatedAt: "updatedAt" }, LinearClient: class { issues = mocks.issues; team = mocks.team; } }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue([{ expiresAt: new Date(Date.now() + 3600_000), encryptedAccessToken: "fixture", scopes: ["read"] }]);
});
function ticket(id: string, sortOrder: number) {
  return { id, identifier: `API-${id}`, title: id, description: null, url: "https://linear.app", priorityLabel: "High", priority: 2, sortOrder, estimate: null, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02"), state: Promise.resolve({ name: "Todo", type: "unstarted" }) };
}
describe("Linear intake boundary", () => {
  it("fetches every page, applies unestimated/unfinished/cycle filters and restores manual order", async () => {
    const connection = { nodes: [ticket("late", 30)], pageInfo: { hasNextPage: true }, fetchNext: vi.fn(async () => { connection.nodes.push(ticket("early", 10)); connection.pageInfo.hasNextPage = false; }) };
    mocks.issues.mockResolvedValue(connection);
    const items = await loadIntakeIssues("user", "team", { cycleOffset: 2, cycleId: "pinned", name: "Cycle", startsAt: null, endsAt: null });
    expect(items.map(item => item.id)).toEqual(["early", "late"]);
    expect(connection.fetchNext).toHaveBeenCalledTimes(1);
    expect(mocks.issues).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.objectContaining({ team: { id: { eq: "team" } }, cycle: { id: { eq: "pinned" } }, estimate: { null: true }, state: { type: { in: ["backlog", "unstarted", "started", "triage"] } } }) }));
  });
  it("loads only no-cycle work for backlog, not all team tickets", async () => {
    const source = await resolveSessionIntake("user", "team", "backlog");
    expect(mocks.team).not.toHaveBeenCalled();
    mocks.issues.mockResolvedValue({ nodes: [], pageInfo: { hasNextPage: false } });
    await loadIntakeIssues("user", "team", source);
    expect(mocks.issues).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.objectContaining({ cycle: { null: true }, estimate: { null: true } }) }));
  });
  it("reports a missing future cycle instead of silently falling back", async () => {
    mocks.team.mockResolvedValue({ cycles: async () => ({ nodes: [], pageInfo: { hasNextPage: false } }) });
    await expect(resolveSessionIntake("user", "team", 3)).rejects.toThrow("does not exist yet");
  });
});
