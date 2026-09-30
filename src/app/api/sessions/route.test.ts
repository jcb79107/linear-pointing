import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ team: vi.fn(), settings: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireCurrentUser: async () => ({ id: "user", organizationId: "org" }) }));
vi.mock("@/lib/linear", () => ({ getLinearTeam: mocks.team, hasLinearWriteScope: async () => true }));
vi.mock("@/lib/team-settings", () => ({ getTeamDefaults: mocks.settings }));
vi.mock("@/lib/sessions", () => ({ createPokerSession: mocks.create, listPokerSessions: vi.fn() }));
import { POST } from "./route";
beforeEach(() => { vi.clearAllMocks(); mocks.settings.mockResolvedValue({ pointingPreset: "custom", customPointValues: [0,42], autoReveal: false }); mocks.create.mockResolvedValue({ id: "new-room" }); });
describe("new session inherits the selected Linear team", () => {
  it("ignores stale custom decks and preserves T-shirt labels, zero and extended configuration", async () => {
    mocks.team.mockResolvedValue({ id: "selected-team", key: "T", name: "Team", issueEstimationType: "tShirt", issueEstimationAllowZero: false, issueEstimationExtended: true });
    const response = await POST(new Request("https://pointed.test/api/sessions", { method: "POST", headers: { origin: "https://pointed.test", "Content-Type": "application/json" }, body: JSON.stringify({ title: "Refinement", teamId: "selected-team" }) }));
    expect(response.status).toBe(201); expect(mocks.team).toHaveBeenCalledWith("user", "selected-team");
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ autoReveal: false, pointingCards: [
      { value: 1, label: "XS" }, { value: 2, label: "S" }, { value: 3, label: "M" }, { value: 5, label: "L" }, { value: 8, label: "XL" }, { value: 13, label: "XXL" }, { value: 21, label: "XXXL" },
    ] }));
  });
});

it("rejects disabled estimates even when a stale zero flag is enabled", async () => {
  mocks.team.mockResolvedValue({ id: "selected-team", key: "T", name: "Disabled team", issueEstimationType: "notUsed", issueEstimationAllowZero: true, issueEstimationExtended: true });
  const response = await POST(new Request("https://pointed.test/api/sessions", { method: "POST", headers: { origin: "https://pointed.test", "Content-Type": "application/json" }, body: JSON.stringify({ title: "Refinement", teamId: "selected-team" }) }));
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ error: "Disabled team does not have estimates enabled in Linear" });
  expect(mocks.create).not.toHaveBeenCalled();
});
