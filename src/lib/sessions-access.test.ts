import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import * as schema from "@/db/schema";
import type { LinearIssueSummary, SessionSnapshot } from "./domain";
import { DEFAULT_TEAM_DEFAULTS } from "./team-defaults";

const mocks = vi.hoisted(() => ({
  db: undefined as PgliteDatabase<typeof schema> | undefined,
  cookieToken: undefined as string | undefined,
  access: vi.fn<(userId: string, teamId: string) => Promise<boolean>>(),
  issue: vi.fn(),
  writeEstimate: vi.fn(),
  broadcast: vi.fn(),
  authorizePresence: vi.fn(),
  captureException: vi.fn(),
  queries: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  get db() {
    return mocks.db;
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "lpp_session" && mocks.cookieToken
        ? { name, value: mocks.cookieToken }
        : undefined,
  }),
}));
vi.mock("@/lib/linear", () => ({
  userHasTeamAccess: mocks.access,
  getLinearIssue: mocks.issue,
  updateLinearIssueEstimate: mocks.writeEstimate,
}));
vi.mock("@/lib/realtime", () => ({
  broadcastSessionChanged: mocks.broadcast,
  authorizePresenceChannel: mocks.authorizePresence,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }));

import { POST as authorizeRealtime } from "@/app/api/pusher/auth/route";
import { POST as joinSession } from "@/app/api/s/[code]/join/route";
import { POST as sessionAction } from "@/app/api/sessions/[id]/actions/route";
import { GET as sessionSnapshot } from "@/app/api/sessions/[id]/snapshot/route";
import { POST as vote } from "@/app/api/sessions/[id]/vote/route";
import { getCurrentUser, requireCurrentUser } from "./auth";
import { hashToken } from "./crypto";
import {
  addQueueItems,
  createPokerSession,
  getSessionSnapshot,
  joinPokerSession,
  listPokerSessions,
  startPokerSession,
  userCanJoinRealtimeChannel,
} from "./sessions";

// Real migrations, transactions, auth-session lookup, and route handlers run
// locally. Only Next's cookie context and external Linear/Pusher/Sentry edges
// are mocked. These are disposable integration tests, not real OAuth evidence.
let client: PGlite;
const db = () => mocks.db!;
const origin = "https://pointed.example";
const team = {
  id: "synthetic-team",
  key: "TEST",
  name: "Synthetic team",
  issueEstimationType: "linear" as const,
  issueEstimationAllowZero: true,
  issueEstimationExtended: false,
};
const issue: LinearIssueSummary = {
  id: "synthetic-issue",
  identifier: "TEST-1",
  title: "Private synthetic ticket",
  description: "Synthetic description visible only to session members",
  url: "https://linear.app/example/issue/TEST-1",
  priorityLabel: "High",
  priority: 2,
  sortOrder: 1,
  stateName: "Todo",
  stateType: "unstarted",
  assigneeName: null,
  assigneeId: null,
  projectName: null,
  labels: [],
  subIssues: [],
  attachments: [],
  estimate: null,
  teamId: team.id,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
  dueDate: null,
};

async function actor(
  organizationId: string = randomUUID(),
  linearUserId: string = randomUUID(),
) {
  const [user] = await db()
    .insert(schema.users)
    .values({ organizationId, linearUserId, displayName: "Synthetic participant" })
    .returning();
  const token = randomUUID();
  const [authSession] = await db()
    .insert(schema.authSessions)
    .values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 86400000),
    })
    .returning();
  return { ...user, token, authSession };
}
type Actor = Awaited<ReturnType<typeof actor>>;

async function asUser(user: Actor) {
  mocks.cookieToken = user.token;
  // Exercise real cookie hashing and the app's unexpired auth-session lookup.
  expect(await requireCurrentUser()).toMatchObject({
    id: user.id,
    sessionId: user.authSession.id,
    organizationId: user.organizationId,
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
function post(path: string, body: unknown) {
  return new Request(`${origin}${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function readSnapshot(id: string) {
  return sessionSnapshot(
    new Request(`${origin}/api/sessions/${id}/snapshot`),
    context(id),
  );
}
function cast(id: string, value: number) {
  return vote(post(`/api/sessions/${id}/vote`, { value }), context(id));
}
function act(id: string, body: Record<string, unknown>) {
  return sessionAction(post(`/api/sessions/${id}/actions`, body), context(id));
}
function rejoin(code: string) {
  return joinSession(post(`/api/s/${code}/join`, {}), {
    params: Promise.resolve({ code }),
  });
}
function realtime(id: string) {
  return authorizeRealtime(
    new Request(`${origin}/api/pusher/auth`, {
      method: "POST",
      headers: { origin },
      body: new URLSearchParams({
        socket_id: "123.456",
        channel_name: `presence-session-${id}`,
      }),
    }),
  );
}
async function responseSnapshot(response: Response): Promise<SessionSnapshot> {
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.snapshot).toBeDefined();
  return body.snapshot;
}
async function forbidden(response: Response) {
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "Not allowed" });
}
async function accessFailure(response: Response, outcome: "denied" | "unavailable") {
  expect(response.status).toBe(outcome === "denied" ? 403 : 503);
  expect(await response.json()).toEqual(outcome === "denied" ? {
    error: "You no longer have access to this room.", code: "ROOM_ACCESS_DENIED",
  } : {
    error: "Unable to verify Linear access. Try again.", code: "LINEAR_ACCESS_UNAVAILABLE",
  });
}
function participantVotes(snapshot: SessionSnapshot) {
  return Object.fromEntries(
    snapshot.participants.map(({ id, vote, hasVoted }) => [id, { vote, hasVoted }]),
  );
}
async function membership(sessionId: string, userId: string) {
  return db()
    .select()
    .from(schema.participants)
    .where(
      and(
        eq(schema.participants.sessionId, sessionId),
        eq(schema.participants.userId, userId),
      ),
    );
}
async function liveSession(autoReveal = false) {
  const host = await actor();
  const voter = await actor(host.organizationId);
  const session = await createPokerSession({
    userId: host.id,
    organizationId: host.organizationId,
    title: "Synthetic access regression",
    team,
    pointingCards: [0, 1, 2, 3].map((value) => ({ value, label: `${value}` })),
    autoReveal,
    defaults: { ...DEFAULT_TEAM_DEFAULTS, autoReveal, facilitatorVotes: true },
  });
  await joinPokerSession(session.code, voter);
  expect(mocks.access).toHaveBeenCalledWith(voter.id, team.id);
  await addQueueItems({
    sessionId: session.id,
    userId: host.id,
    issueIds: [issue.id],
    policy: { stateTypes: ["unstarted"], estimateScope: "unestimated" },
  });
  await startPokerSession(session.id, host.id);
  const snapshot = await getSessionSnapshot(session.id, host.id);
  expect(snapshot.status).toBe("live");
  expect(snapshot.round?.status).toBe("voting");
  expect(snapshot.round?.eligibleVoterIds.toSorted()).toEqual(
    [host.id, voter.id].toSorted(),
  );
  return { host, voter, session, roundId: snapshot.round!.id };
}
type Fixture = Awaited<ReturnType<typeof liveSession>>;

beforeAll(async () => {
  client = new PGlite();
  mocks.db = drizzle(client, {
    schema,
    logger: { logQuery: (query) => { mocks.queries.push(query); } },
  });
  await migrate(db(), { migrationsFolder: "drizzle" });
}, 30000);
afterAll(async () => {
  await client?.close();
});
beforeEach(async () => {
  await db().execute(sql`TRUNCATE TABLE users CASCADE`);
  mocks.cookieToken = undefined;
  mocks.access.mockReset().mockResolvedValue(true);
  mocks.issue.mockReset().mockResolvedValue(issue);
  mocks.writeEstimate.mockReset();
  mocks.broadcast.mockReset().mockResolvedValue(undefined);
  mocks.authorizePresence.mockReset().mockReturnValue({ auth: "synthetic-only" });
  mocks.captureException.mockReset();
  mocks.queries.length = 0;
});
afterEach(() => {
  // Expected authorization denials must not become unexpected API errors.
  expect(mocks.captureException).not.toHaveBeenCalled();
});

describe("two-user vote secrecy through authenticated routes", () => {
  it("shows each user only their own vote until a facilitator reveals", async () => {
    const { host, voter, session, roundId } = await liveSession();
    await asUser(host);
    const empty = await responseSnapshot(await readSnapshot(session.id));
    expect(participantVotes(empty)).toEqual({
      [host.id]: { vote: null, hasVoted: false },
      [voter.id]: { vote: null, hasVoted: false },
    });
    const first = await responseSnapshot(await cast(session.id, 1));
    expect(first.currentUserId).toBe(host.id);
    expect(participantVotes(first)).toEqual({
      [host.id]: { vote: 1, hasVoted: true },
      [voter.id]: { vote: null, hasVoted: false },
    });
    await asUser(voter);
    const peer = await responseSnapshot(await readSnapshot(session.id));
    expect(participantVotes(peer)[host.id]).toEqual({ vote: null, hasVoted: true });
    const second = await responseSnapshot(await cast(session.id, 3));
    expect(second.round?.status).toBe("voting");
    expect(participantVotes(second)).toEqual({
      [host.id]: { vote: null, hasVoted: true },
      [voter.id]: { vote: 3, hasVoted: true },
    });
    await forbidden(await act(session.id, { action: "reveal" }));
    await asUser(host);
    const hostView = await responseSnapshot(await readSnapshot(session.id));
    expect(participantVotes(hostView)).toEqual({
      [host.id]: { vote: 1, hasVoted: true },
      [voter.id]: { vote: null, hasVoted: true },
    });
    // Privacy is a response boundary, not an artifact of missing stored votes.
    const stored = await db().select().from(schema.votes)
      .where(eq(schema.votes.roundId, roundId));
    expect(Object.fromEntries(stored.map((row) => [row.userId, row.value])))
      .toEqual({ [host.id]: "1", [voter.id]: "3" });
    const revealed = await responseSnapshot(await act(session.id, { action: "reveal" }));
    expect(revealed.round?.status).toBe("revealed");
    expect(participantVotes(revealed)).toEqual({
      [host.id]: { vote: 1, hasVoted: true },
      [voter.id]: { vote: 3, hasVoted: true },
    });
    await asUser(voter);
    expect(participantVotes(await responseSnapshot(await readSnapshot(session.id))))
      .toEqual(participantVotes(revealed));
    expect(mocks.writeEstimate).not.toHaveBeenCalled();
    expect(mocks.broadcast.mock.calls.filter(([, reason]) => reason === "vote-updated"))
      .toEqual([[session.id, "vote-updated"], [session.id, "vote-updated"]]);
  });

  it("keeps updated votes private and does not expose abandoned-round votes after revote", async () => {
    const { host, voter, session, roundId } = await liveSession();
    await asUser(voter);
    await responseSnapshot(await cast(session.id, 3));
    await responseSnapshot(await cast(session.id, 0));
    await asUser(host);
    expect(participantVotes(await responseSnapshot(await readSnapshot(session.id)))[voter.id])
      .toEqual({ vote: null, hasVoted: true });
    const revealed = await responseSnapshot(await act(session.id, { action: "reveal" }));
    expect(participantVotes(revealed)[voter.id]).toEqual({ vote: 0, hasVoted: true });
    const nextRound = await responseSnapshot(await act(session.id, { action: "revote" }));
    expect(nextRound.round).toMatchObject({ number: 2, status: "voting" });
    expect(nextRound.round?.id).not.toBe(roundId);
    await asUser(voter);
    expect(participantVotes(await responseSnapshot(await readSnapshot(session.id))))
      .toEqual({
        [host.id]: { vote: null, hasVoted: false },
        [voter.id]: { vote: null, hasVoted: false },
      });
    expect(await db().select().from(schema.votes).where(eq(schema.votes.roundId, roundId)))
      .toMatchObject([{ userId: voter.id, value: "0" }]);
  });

  it("auto-reveals only after both eligible users vote, without writing an estimate to Linear", async () => {
    const { host, voter, session } = await liveSession(true);
    await asUser(host);
    expect((await responseSnapshot(await cast(session.id, 1))).round?.status).toBe("voting");
    await asUser(voter);
    const before = await responseSnapshot(await readSnapshot(session.id));
    expect(participantVotes(before)[host.id]).toEqual({ vote: null, hasVoted: true });
    const after = await responseSnapshot(await cast(session.id, 3));
    expect(mocks.writeEstimate).not.toHaveBeenCalled();
    expect(after.round?.status).toBe("revealed");
    expect(participantVotes(after)).toEqual({
      [host.id]: { vote: 1, hasVoted: true },
      [voter.id]: { vote: 3, hasVoted: true },
    });
    await asUser(host);
    expect(participantVotes(await responseSnapshot(await readSnapshot(session.id))))
      .toEqual(participantVotes(after));
  });

  it("saves an estimate only on facilitator confirmation using mocked Linear write-back", async () => {
    const { host, voter, session, roundId } = await liveSession();
    await asUser(host);
    await responseSnapshot(await cast(session.id, 1));
    await asUser(voter);
    await responseSnapshot(await cast(session.id, 3));
    await forbidden(await act(session.id, { action: "finalize", estimate: 2 }));
    await asUser(host);
    const revealed = await responseSnapshot(await act(session.id, { action: "reveal" }));
    expect(revealed.round?.status).toBe("revealed");
    expect(mocks.writeEstimate).not.toHaveBeenCalled();

    await asUser(voter);
    await forbidden(await act(session.id, { action: "finalize", estimate: 2 }));
    expect(mocks.writeEstimate).not.toHaveBeenCalled();
    await asUser(host);
    expect(await responseSnapshot(await readSnapshot(session.id))).toEqual(revealed);
    mocks.issue.mockClear();
    mocks.writeEstimate.mockResolvedValue(undefined);
    const saved = await responseSnapshot(await act(session.id, { action: "finalize", estimate: 2 }));
    expect(mocks.issue).toHaveBeenCalledExactlyOnceWith(host.id, issue.id);
    // This verifies our provider-call contract; no real Linear write occurs.
    expect(mocks.writeEstimate).toHaveBeenCalledExactlyOnceWith(host.id, issue.id, 2);
    expect(saved.status).toBe("ended");
    expect(saved.activeItemId).toBeNull();
    expect(saved.round).toBeNull();
    expect(saved.queue).toMatchObject([{
      linearIssueId: issue.id,
      status: "estimated",
      currentEstimate: 2,
      finalEstimate: 2,
      groomingOutcome: "ready",
    }]);
    expect(await db().select().from(schema.rounds).where(eq(schema.rounds.id, roundId)))
      .toMatchObject([{ status: "finalized", finalizedAt: expect.any(Date) }]);
    expect(await db().select().from(schema.auditEvents).where(and(
      eq(schema.auditEvents.sessionId, session.id),
      eq(schema.auditEvents.eventType, "estimate.finalized"),
    ))).toMatchObject([{
      actorUserId: host.id,
      metadata: { linearIssueId: issue.id, estimate: 2, outcome: "ready" },
    }]);
    await asUser(voter);
    const voterView = await responseSnapshot(await readSnapshot(session.id));
    expect(voterView.queue).toEqual(saved.queue);
    expect(voterView.status).toBe("ended");
  });
});

describe("session membership and workspace boundaries", () => {
  it.each(["same-workspace outsider", "different-workspace user"] as const)(
    "rejects a %s across snapshots, votes, realtime, and facilitator actions",
    async (kind) => {
      const { host, session } = await liveSession();
      const outsider = await actor(
        kind === "same-workspace outsider" ? host.organizationId : randomUUID(),
        // The same Linear identity in another organization is a different app user.
        kind === "different-workspace user" ? host.linearUserId : randomUUID(),
      );
      const ownSession = await createPokerSession({
        userId: outsider.id,
        organizationId: outsider.organizationId,
        title: "Outsider's own session",
        team,
        pointingCards: [{ value: 1, label: "1" }],
        autoReveal: false,
      });
      await asUser(outsider);
      expect(await userCanJoinRealtimeChannel(ownSession.id, outsider.id)).toBe(true);
      const before = await getSessionSnapshot(session.id, host.id);
      mocks.broadcast.mockClear();
      await accessFailure(await readSnapshot(session.id), "denied");
      await accessFailure(await cast(session.id, 1), "denied");
      expect(await userCanJoinRealtimeChannel(session.id, outsider.id)).toBe(false);
      await accessFailure(await realtime(session.id), "denied");
      for (const action of ["reveal", "revote", "finish"]) {
        await accessFailure(await act(session.id, { action }), "denied");
      }
      await accessFailure(await act(session.id, { action: "finalize", estimate: 1 }), "denied");
      expect(mocks.writeEstimate).not.toHaveBeenCalled();
      expect(await getSessionSnapshot(session.id, host.id)).toEqual(before);
      expect(await membership(session.id, outsider.id)).toEqual([]);
      expect(mocks.broadcast).not.toHaveBeenCalled();
      expect(mocks.authorizePresence).not.toHaveBeenCalled();
      expect((await listPokerSessions(outsider.id, outsider.organizationId)).map(({ id }) => id))
        .toEqual([ownSession.id]);
      if (kind === "different-workspace user") {
        mocks.access.mockClear();
        await forbidden(await rejoin(session.code));
        expect(mocks.access).not.toHaveBeenCalled();
        expect(await listPokerSessions(outsider.id, host.organizationId)).toEqual([]);
      }
    },
  );

  it("rejects a same-workspace first join when Linear team access is denied", async () => {
    const { host, session } = await liveSession();
    const outsider = await actor(host.organizationId);
    await asUser(outsider);
    mocks.access.mockReset().mockResolvedValue(false);
    await forbidden(await rejoin(session.code));
    expect(mocks.access).toHaveBeenCalledWith(outsider.id, team.id);
    expect(await membership(session.id, outsider.id)).toEqual([]);
  });

  it("allows members' realtime authorization while rejecting a voter's facilitator escalation", async () => {
    const { host, voter, session } = await liveSession();
    await asUser(voter);
    expect(await userCanJoinRealtimeChannel(session.id, voter.id)).toBe(true);
    expect((await realtime(session.id)).status).toBe(200);
    expect(mocks.authorizePresence).toHaveBeenCalledWith(
      "123.456", `presence-session-${session.id}`, expect.objectContaining({ id: voter.id }),
    );
    const before = await getSessionSnapshot(session.id, host.id);
    for (const action of ["reveal", "revote", "finish"]) {
      await forbidden(await act(session.id, { action }));
    }
    await forbidden(await act(session.id, {
      action: "participant-role", participantUserId: voter.id, role: "facilitator",
    }));
    expect(await getSessionSnapshot(session.id, host.id)).toEqual(before);
  });

  it("returns 401 without a valid app session even for a persisted participant", async () => {
    const { voter, session } = await liveSession();
    await asUser(voter);
    mocks.cookieToken = "not-a-valid-session";
    expect(await getCurrentUser()).toBeNull();
    for (const response of [
      await readSnapshot(session.id), await cast(session.id, 1),
      await realtime(session.id), await rejoin(session.code),
      await act(session.id, { action: "reveal" }),
    ]) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Sign in required" });
    }
    expect(await membership(session.id, voter.id)).toHaveLength(1);
  });
});

// Protected room operations require current provider access in addition to an
// existing app login and room membership. All provider responses are synthetic.
describe.each(["voter", "host"] as const)("current team-access enforcement for %s", (role) => {
  let fixture: Fixture;
  let member: Actor;
  let originalMembership: Awaited<ReturnType<typeof membership>>;

  beforeEach(async () => {
    fixture = await liveSession();
    member = fixture[role];
    await asUser(member);
    expect((await readSnapshot(fixture.session.id)).status).toBe(200);
    expect((await realtime(fixture.session.id)).status).toBe(200);
    expect((await cast(fixture.session.id, 1)).status).toBe(200);
    originalMembership = await membership(fixture.session.id, member.id);
    expect(originalMembership).toHaveLength(1);

    // Change only the provider-access outcome. Keep app auth and membership
    // intact so denial cannot be explained by logout or participant removal.
    mocks.access.mockReset().mockImplementation(async (userId) => userId !== member.id);
    expect(await mocks.access(member.id, team.id)).toBe(false);
    mocks.access.mockClear();
    await asUser(member);
    expect(await db().select().from(schema.authSessions)
      .where(eq(schema.authSessions.id, member.authSession.id)))
      .toEqual([member.authSession]);
    expect(await membership(fixture.session.id, member.id)).toEqual(originalMembership);
    expect(await db().select().from(schema.roundVoters).where(and(
      eq(schema.roundVoters.roundId, fixture.roundId),
      eq(schema.roundVoters.userId, member.id),
    ))).toEqual([{ roundId: fixture.roundId, userId: member.id }]);
    mocks.authorizePresence.mockClear();
    mocks.broadcast.mockClear();
    mocks.issue.mockClear();
    mocks.writeEstimate.mockClear();
    mocks.queries.length = 0;
  });

  it("denies rejoin while retaining the valid app login and original session membership", async () => {
    await forbidden(await rejoin(fixture.session.code));
    expect(mocks.access).toHaveBeenCalledExactlyOnceWith(member.id, team.id);
    await asUser(member);
    expect(await membership(fixture.session.id, member.id)).toEqual(originalMembership);
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });

  it.each(["denied", "unavailable"] as const)(
    "allows the next successful check after access was %s without replacing login or membership",
    async (outcome) => {
      if (outcome === "unavailable") {
        mocks.access.mockRejectedValue(new Error("Synthetic provider check unavailable"));
      }
      await accessFailure(await readSnapshot(fixture.session.id), outcome);
      mocks.access.mockReset().mockResolvedValue(true);
      await asUser(member);
      const restored = await responseSnapshot(await readSnapshot(fixture.session.id));
      expect(restored.currentUserId).toBe(member.id);
      expect(restored.queue).toHaveLength(1);
      expect(mocks.access).toHaveBeenCalledExactlyOnceWith(member.id, team.id);
      expect(await membership(fixture.session.id, member.id)).toEqual(originalMembership);
    },
  );

  describe.each(["denied", "unavailable"] as const)("when the provider check is %s", (outcome) => {
    beforeEach(() => {
      if (outcome === "unavailable") {
        mocks.access.mockRejectedValue(new Error("Synthetic provider check unavailable"));
      }
    });

    afterEach(async () => {
      expect(mocks.access).toHaveBeenCalledExactlyOnceWith(member.id, team.id);
      // The access gate runs before room-content reads and all mutations.
      // Verify the query logger observed the membership lookup to avoid a
      // vacuous no-query assertion if its instrumentation stops working.
      expect(mocks.queries.some((query) => query.includes('from "poker_sessions"'))).toBe(true);
      expect(mocks.queries.filter((query) =>
        /\bfrom "(?:queue_items|rounds|round_voters|round_signals|votes|audit_events)"/.test(query),
      )).toEqual([]);
      expect(mocks.queries.filter((query) =>
        /^\s*(?:insert|update|delete|truncate|begin)\b/i.test(query),
      )).toEqual([]);
      expect(mocks.authorizePresence).not.toHaveBeenCalled();
      expect(mocks.broadcast).not.toHaveBeenCalled();
      expect(mocks.issue).not.toHaveBeenCalled();
      expect(mocks.writeEstimate).not.toHaveBeenCalled();

      // Independently inspect persisted state after the denied operation.
      expect(await db().select({ value: schema.votes.value }).from(schema.votes).where(and(
        eq(schema.votes.roundId, fixture.roundId),
        eq(schema.votes.userId, member.id),
      ))).toEqual([{ value: "1" }]);
      expect(await db().select({ number: schema.rounds.number, status: schema.rounds.status })
        .from(schema.rounds).where(eq(schema.rounds.sessionId, fixture.session.id)))
        .toEqual([{ number: 1, status: "voting" }]);
      expect(await db().select({ status: schema.pokerSessions.status }).from(schema.pokerSessions)
        .where(eq(schema.pokerSessions.id, fixture.session.id))).toEqual([{ status: "live" }]);
      expect(await membership(fixture.session.id, member.id)).toEqual(originalMembership);
      await asUser(member);
    });

    it("denies cached snapshot reads", async () => {
      await accessFailure(await readSnapshot(fixture.session.id), outcome);
    });

    it("denies vote changes", async () => {
      await accessFailure(await cast(fixture.session.id, 3), outcome);
    });

    it("denies realtime eligibility", async () => {
      expect(await userCanJoinRealtimeChannel(fixture.session.id, member.id)).toBe(false);
    });

    it("denies realtime authorization", async () => {
      await accessFailure(await realtime(fixture.session.id), outcome);
    });

    if (role === "host") {
      it.each(["reveal", "revote", "finish"])("denies facilitator %s", async (action) => {
        await accessFailure(await act(fixture.session.id, { action }), outcome);
      });
    }
  });
});
