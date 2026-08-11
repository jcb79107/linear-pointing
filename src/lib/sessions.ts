import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  max,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  auditEvents,
  participants,
  pokerSessions,
  queueItems,
  rounds,
  roundVoters,
  users,
  votes,
} from "@/db/schema";
import type {
  LinearIssueSummary,
  LinearTeamSummary,
  ParticipantRole,
  SessionSnapshot,
  VoteValue,
} from "@/lib/domain";
import { isFinalizableEstimate, POINTING_CARDS } from "@/lib/estimates";
import { isDefaultFacilitatorEmail } from "@/lib/facilitators";
import {
  getLinearIssue,
  updateLinearIssueEstimate,
  userHasTeamAccess,
} from "@/lib/linear";
import {
  isPointableLinearIssue,
  LINEAR_TODO_STATE_TYPE,
  pointingEligibilityError,
} from "@/lib/pointing-eligibility";
import {
  canAddQueueItems,
  canClearQueue,
  queueItemRemovalError,
} from "@/lib/queue";
import { broadcastSessionChanged } from "@/lib/realtime";
import {
  canFacilitate,
  nextPendingItemId,
  publicVoteValue,
  shouldAutoReveal,
} from "@/lib/rounds";

function sessionCode(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 10);
}

function parseVote(value: string): VoteValue {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Invalid stored vote");
  return number;
}

function serializeVote(value: VoteValue): string {
  return `${value}`;
}

function requirePointableIssue(issue: LinearIssueSummary): void {
  const reason = pointingEligibilityError(issue, issue.identifier);
  if (reason) throw new Error(`UNPROCESSABLE:${reason}`);
}

function requireTodoIssue(issue: LinearIssueSummary): void {
  if (issue.stateType !== LINEAR_TODO_STATE_TYPE) {
    throw new Error(
      `UNPROCESSABLE:${issue.identifier} is no longer in Todo and cannot be pointed`,
    );
  }
}

async function audit(
  sessionId: string,
  actorUserId: string | null,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(auditEvents).values({
    sessionId,
    actorUserId,
    eventType,
    metadata,
  });
}

export async function createPokerSession(input: {
  userId: string;
  organizationId: string;
  title: string;
  team: LinearTeamSummary;
}) {
  if (
    input.team.issueEstimationType !== "linear" ||
    !input.team.issueEstimationAllowZero
  ) {
    throw new Error(
      "This tool requires the Linear scale with zero estimates enabled",
    );
  }

  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(pokerSessions)
      .values({
        code: sessionCode(),
        organizationId: input.organizationId,
        teamId: input.team.id,
        teamName: input.team.name,
        title: input.title,
        hostUserId: input.userId,
        scaleType: input.team.issueEstimationType,
        scaleAllowZero: input.team.issueEstimationAllowZero,
        scaleExtended: input.team.issueEstimationExtended,
      })
      .returning();

    await tx.insert(participants).values({
      sessionId: session.id,
      userId: input.userId,
      role: "facilitator",
    });
    return session;
  });
}

export async function listPokerSessions(
  userId: string,
  organizationId: string,
) {
  return db
    .select({
      id: pokerSessions.id,
      code: pokerSessions.code,
      title: pokerSessions.title,
      teamName: pokerSessions.teamName,
      status: pokerSessions.status,
      updatedAt: pokerSessions.updatedAt,
      activeQueueItemId: pokerSessions.activeQueueItemId,
      issueCount: sql<number>`count(distinct ${queueItems.id})::int`,
    })
    .from(pokerSessions)
    .innerJoin(
      participants,
      and(
        eq(participants.sessionId, pokerSessions.id),
        eq(participants.userId, userId),
      ),
    )
    .leftJoin(queueItems, eq(queueItems.sessionId, pokerSessions.id))
    .where(eq(pokerSessions.organizationId, organizationId))
    .groupBy(pokerSessions.id)
    .orderBy(desc(pokerSessions.updatedAt));
}

export async function addQueueItems(input: {
  sessionId: string;
  userId: string;
  issueIds: string[];
}) {
  const membership = await requireFacilitator(input.sessionId, input.userId);
  const session = membership.session;
  if (!canAddQueueItems(session.status)) {
    throw new Error("Ended sessions cannot accept new tickets");
  }
  const uniqueIssueIds = [...new Set(input.issueIds)];
  const existing = await db
    .select({ linearIssueId: queueItems.linearIssueId })
    .from(queueItems)
    .where(
      and(
        eq(queueItems.sessionId, input.sessionId),
        inArray(queueItems.linearIssueId, uniqueIssueIds),
      ),
    );
  const existingIds = new Set(existing.map((item) => item.linearIssueId));
  const newIssueIds = uniqueIssueIds.filter(
    (issueId) => !existingIds.has(issueId),
  );
  const issues = [];
  for (let index = 0; index < newIssueIds.length; index += 8) {
    const batch = newIssueIds.slice(index, index + 8);
    issues.push(
      ...(await Promise.all(
        batch.map((issueId) => getLinearIssue(input.userId, issueId)),
      )),
    );
  }
  if (issues.some((issue) => issue.teamId !== session.teamId)) {
    throw new Error("All queue items must belong to the session team");
  }
  const ineligibleIssue = issues.find(
    (issue) => !isPointableLinearIssue(issue),
  );
  if (ineligibleIssue) {
    requirePointableIssue(ineligibleIssue);
  }

  const [{ lastPosition }] = await db
    .select({ lastPosition: max(queueItems.position) })
    .from(queueItems)
    .where(eq(queueItems.sessionId, input.sessionId));
  const start = (lastPosition ?? -1) + 1;

  let insertedCount = 0;
  if (issues.length) {
    const inserted = await db
      .insert(queueItems)
      .values(
        issues.map((issue, index) => ({
          sessionId: input.sessionId,
          linearIssueId: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          url: issue.url,
          priorityLabel: issue.priorityLabel,
          stateName: issue.stateName,
          assigneeName: issue.assigneeName,
          projectName: issue.projectName,
          labels: issue.labels,
          subIssues: issue.subIssues,
          attachments: issue.attachments,
          position: start + index,
          currentEstimate: issue.estimate,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: queueItems.id });
    insertedCount = inserted.length;
  }
  if (insertedCount > 0) {
    await audit(input.sessionId, input.userId, "queue.items_added", {
      count: insertedCount,
      whileLive: session.status === "live",
    });
  }
  await broadcastSessionChanged(input.sessionId, "queue-updated");
}

export async function reorderQueue(input: {
  sessionId: string;
  userId: string;
  orderedItemIds: string[];
}) {
  const { session } = await requireFacilitator(input.sessionId, input.userId);
  if (session.status !== "draft") {
    throw new Error("Only draft queues can be reordered");
  }

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: queueItems.id })
      .from(queueItems)
      .where(eq(queueItems.sessionId, input.sessionId));
    if (
      existing.length !== input.orderedItemIds.length ||
      existing.some((item) => !input.orderedItemIds.includes(item.id))
    ) {
      throw new Error("Queue order does not match the current session");
    }
    for (const [position, itemId] of input.orderedItemIds.entries()) {
      await tx
        .update(queueItems)
        .set({ position, updatedAt: new Date() })
        .where(
          and(
            eq(queueItems.id, itemId),
            eq(queueItems.sessionId, input.sessionId),
          ),
        );
    }
  });
  await broadcastSessionChanged(input.sessionId, "queue-reordered");
}

export async function removeQueueItem(input: {
  sessionId: string;
  userId: string;
  queueItemId: string;
}) {
  const { session } = await requireFacilitator(input.sessionId, input.userId);
  await db.transaction(async (tx) => {
    const [item] = await tx
      .select({
        id: queueItems.id,
        identifier: queueItems.identifier,
        status: queueItems.status,
      })
      .from(queueItems)
      .where(
        and(
          eq(queueItems.id, input.queueItemId),
          eq(queueItems.sessionId, input.sessionId),
        ),
      )
      .limit(1);
    if (!item) throw new Error("Queue item not found");
    const removalError = queueItemRemovalError(session.status, item.status);
    if (removalError) throw new Error(removalError);
    await tx
      .delete(queueItems)
      .where(
        and(
          eq(queueItems.id, input.queueItemId),
          eq(queueItems.sessionId, input.sessionId),
        ),
      );
    const remaining = await tx
      .select({ id: queueItems.id })
      .from(queueItems)
      .where(eq(queueItems.sessionId, input.sessionId))
      .orderBy(asc(queueItems.position));
    for (const [position, item] of remaining.entries()) {
      await tx
        .update(queueItems)
        .set({ position, updatedAt: new Date() })
        .where(eq(queueItems.id, item.id));
    }
    await tx.insert(auditEvents).values({
      sessionId: input.sessionId,
      actorUserId: input.userId,
      eventType: "queue.item_removed",
      metadata: {
        identifier: item.identifier,
        whileLive: session.status === "live",
      },
    });
  });
  await broadcastSessionChanged(input.sessionId, "queue-updated");
}

export async function clearQueue(input: {
  sessionId: string;
  userId: string;
}) {
  const { session } = await requireFacilitator(
    input.sessionId,
    input.userId,
  );
  if (!canClearQueue(session.status)) {
    throw new Error("Only draft agendas can be cleared");
  }

  const removed = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: queueItems.id })
      .from(queueItems)
      .where(eq(queueItems.sessionId, input.sessionId));
    if (!existing.length) return 0;
    await tx
      .delete(queueItems)
      .where(eq(queueItems.sessionId, input.sessionId));
    await tx.insert(auditEvents).values({
      sessionId: input.sessionId,
      actorUserId: input.userId,
      eventType: "queue.cleared",
      metadata: { count: existing.length },
    });
    return existing.length;
  });

  if (removed > 0) {
    await broadcastSessionChanged(input.sessionId, "queue-cleared");
  }
  return removed;
}

export async function startPokerSession(sessionId: string, userId: string) {
  const { session } = await requireFacilitator(sessionId, userId);
  if (session.status !== "draft") return session;
  const [firstItem] = await db
    .select()
    .from(queueItems)
    .where(eq(queueItems.sessionId, sessionId))
    .orderBy(asc(queueItems.position))
    .limit(1);
  if (!firstItem) throw new Error("Add at least one issue before starting");
  const refreshedFirst = await getLinearIssue(
    userId,
    firstItem.linearIssueId,
  );
  requirePointableIssue(refreshedFirst);

  await db.transaction(async (tx) => {
    await tx
      .update(pokerSessions)
      .set({
        status: "live",
        activeQueueItemId: firstItem.id,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pokerSessions.id, sessionId));
    await tx
      .update(queueItems)
      .set({
        status: "active",
        title: refreshedFirst.title,
        description: refreshedFirst.description,
        priorityLabel: refreshedFirst.priorityLabel,
        stateName: refreshedFirst.stateName,
        assigneeName: refreshedFirst.assigneeName,
        projectName: refreshedFirst.projectName,
        labels: refreshedFirst.labels,
        subIssues: refreshedFirst.subIssues,
        attachments: refreshedFirst.attachments,
        currentEstimate: refreshedFirst.estimate,
        updatedAt: new Date(),
      })
      .where(eq(queueItems.id, firstItem.id));
    await createRound(tx, session, firstItem.id, refreshedFirst.estimate);
    await tx.insert(auditEvents).values({
      sessionId,
      actorUserId: userId,
      eventType: "session.started",
      metadata: { queueItemId: firstItem.id },
    });
  });
  await broadcastSessionChanged(sessionId, "session-started");
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function createRound(
  tx: Transaction,
  session: typeof pokerSessions.$inferSelect,
  queueItemId: string,
  estimateAtStart: number | null,
) {
  const [{ highestRound }] = await tx
    .select({ highestRound: max(rounds.number) })
    .from(rounds)
    .where(eq(rounds.queueItemId, queueItemId));
  const [round] = await tx
    .insert(rounds)
    .values({
      sessionId: session.id,
      queueItemId,
      number: (highestRound ?? 0) + 1,
      estimateAtStart,
      scaleValues: POINTING_CARDS.map((card) => card.value),
    })
    .returning();

  const eligible = await tx
    .select({ userId: participants.userId })
    .from(participants)
    .where(
      and(
        eq(participants.sessionId, session.id),
        eq(participants.role, "voter"),
      ),
    );
  if (eligible.length) {
    await tx.insert(roundVoters).values(
      eligible.map(({ userId }) => ({
        roundId: round.id,
        userId,
      })),
    );
  }
  return round;
}

export async function joinPokerSession(
  code: string,
  user: { id: string; organizationId: string; email: string | null },
) {
  const [session] = await db
    .select()
    .from(pokerSessions)
    .where(eq(pokerSessions.code, code))
    .limit(1);
  if (!session || session.organizationId !== user.organizationId) {
    throw new Error("FORBIDDEN");
  }
  if (!(await userHasTeamAccess(user.id, session.teamId))) {
    throw new Error("FORBIDDEN");
  }

  const [activeRound] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(
      and(
        eq(rounds.sessionId, session.id),
        inArray(rounds.status, ["voting", "revealed"]),
      ),
    )
    .orderBy(desc(rounds.createdAt))
    .limit(1);

  await db
    .insert(participants)
    .values({
      sessionId: session.id,
      userId: user.id,
      role: isDefaultFacilitatorEmail(user.email)
        ? "facilitator"
        : activeRound
          ? "observer"
          : "voter",
    })
    .onConflictDoUpdate({
      target: [participants.sessionId, participants.userId],
      set: { updatedAt: new Date() },
    });
  await audit(session.id, user.id, "participant.joined");
  await broadcastSessionChanged(session.id, "participant-joined");
  return session;
}

async function requireMembership(sessionId: string, userId: string) {
  const [row] = await db
    .select({
      session: pokerSessions,
      role: participants.role,
    })
    .from(pokerSessions)
    .innerJoin(
      participants,
      and(
        eq(participants.sessionId, pokerSessions.id),
        eq(participants.userId, userId),
      ),
    )
    .where(eq(pokerSessions.id, sessionId))
    .limit(1);
  if (!row) throw new Error("FORBIDDEN");
  return row;
}

async function requireFacilitator(sessionId: string, userId: string) {
  const membership = await requireMembership(sessionId, userId);
  if (!canFacilitate(membership.role)) throw new Error("FORBIDDEN");
  return membership;
}

export async function getSessionInviteDetails(
  sessionId: string,
  userId: string,
) {
  const { session } = await requireFacilitator(sessionId, userId);
  const [count] = await db
    .select({ issueCount: sql<number>`count(*)::int` })
    .from(queueItems)
    .where(eq(queueItems.sessionId, sessionId));

  return {
    code: session.code,
    title: session.title,
    teamName: session.teamName,
    issueCount: count?.issueCount ?? 0,
  };
}

export async function recordSessionAuditEvent(
  sessionId: string,
  actorUserId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await requireFacilitator(sessionId, actorUserId);
  await audit(sessionId, actorUserId, eventType, metadata);
}

export async function getSessionSnapshot(
  sessionId: string,
  userId: string,
): Promise<SessionSnapshot> {
  const { session, role } = await requireMembership(sessionId, userId);
  const [queue, memberRows, activeRound] = await Promise.all([
    db
      .select()
      .from(queueItems)
      .where(eq(queueItems.sessionId, sessionId))
      .orderBy(asc(queueItems.position)),
    db
      .select({
        id: users.id,
        linearUserId: users.linearUserId,
        name: users.displayName,
        avatarUrl: users.avatarUrl,
        role: participants.role,
      })
      .from(participants)
      .innerJoin(users, eq(users.id, participants.userId))
      .where(eq(participants.sessionId, sessionId))
      .orderBy(asc(participants.joinedAt)),
    db
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.sessionId, sessionId),
          or(eq(rounds.status, "voting"), eq(rounds.status, "revealed")),
        ),
      )
      .orderBy(desc(rounds.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const [voterRows, voteRows] = activeRound
    ? await Promise.all([
        db
          .select({ userId: roundVoters.userId })
          .from(roundVoters)
          .innerJoin(
            participants,
            and(
              eq(participants.sessionId, sessionId),
              eq(participants.userId, roundVoters.userId),
              eq(participants.role, "voter"),
            ),
          )
          .where(eq(roundVoters.roundId, activeRound.id)),
        db
          .select({ userId: votes.userId, value: votes.value })
          .from(votes)
          .where(eq(votes.roundId, activeRound.id)),
      ])
    : [[], []];
  const eligibleVoterIds = voterRows.map((row) => row.userId);
  const voteMap = new Map(
    voteRows.map((row) => [row.userId, parseVote(row.value)]),
  );

  return {
    id: session.id,
    code: session.code,
    title: session.title,
    status: session.status,
    teamId: session.teamId,
    teamName: session.teamName,
    scaleType:
      session.scaleType as LinearTeamSummary["issueEstimationType"],
    estimateCards: POINTING_CARDS,
    currentUserId: userId,
    currentUserRole: role,
    activeItemId: session.activeQueueItemId,
    queue: queue.map((item) => ({
      ...item,
      labels: item.labels,
    })),
    participants: memberRows.map((member) => {
      const rawVote =
        member.role === "voter" ? (voteMap.get(member.id) ?? null) : null;
      return {
        ...member,
        online: false,
        hasVoted: member.role === "voter" && voteMap.has(member.id),
        vote:
          rawVote === null || !activeRound
            ? null
            : publicVoteValue(activeRound.status, rawVote),
      };
    }),
    round: activeRound
      ? {
          id: activeRound.id,
          number: activeRound.number,
          status: activeRound.status,
          eligibleVoterIds,
          estimateAtStart: activeRound.estimateAtStart,
          revealedAt: activeRound.revealedAt?.toISOString() ?? null,
        }
      : null,
  };
}

export async function castVote(input: {
  sessionId: string;
  userId: string;
  value: VoteValue;
}) {
  await requireMembership(input.sessionId, input.userId);

  await db.transaction(async (tx) => {
    const [round] = await tx
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.sessionId, input.sessionId),
          eq(rounds.status, "voting"),
        ),
      )
      .orderBy(desc(rounds.createdAt))
      .limit(1);
    if (!round) throw new Error("There is no active voting round");
    await tx.execute(sql`select id from rounds where id = ${round.id} for update`);
    const [lockedRound] = await tx
      .select({ status: rounds.status })
      .from(rounds)
      .where(eq(rounds.id, round.id))
      .limit(1);
    if (lockedRound?.status !== "voting") {
      throw new Error("This round has already been revealed");
    }

    const [eligible] = await tx
      .select({ userId: roundVoters.userId })
      .from(roundVoters)
      .innerJoin(
        participants,
        and(
          eq(participants.sessionId, input.sessionId),
          eq(participants.userId, roundVoters.userId),
          eq(participants.role, "voter"),
        ),
      )
      .where(
        and(
          eq(roundVoters.roundId, round.id),
          eq(roundVoters.userId, input.userId),
        ),
      )
      .limit(1);
    if (!eligible) throw new Error("You are observing this round");

    const validValues = round.scaleValues;
    if (!validValues.includes(input.value)) {
      throw new Error("Vote must be 0, 1, 2, 3, or 4");
    }

    await tx
      .insert(votes)
      .values({
        roundId: round.id,
        userId: input.userId,
        value: serializeVote(input.value),
      })
      .onConflictDoUpdate({
        target: [votes.roundId, votes.userId],
        set: { value: serializeVote(input.value), updatedAt: new Date() },
      });

    const [eligibleRows, voteRows] = await Promise.all([
      tx
        .select({ userId: roundVoters.userId })
        .from(roundVoters)
        .innerJoin(
          participants,
          and(
            eq(participants.sessionId, input.sessionId),
            eq(participants.userId, roundVoters.userId),
            eq(participants.role, "voter"),
          ),
        )
        .where(eq(roundVoters.roundId, round.id)),
      tx
        .select({ userId: votes.userId })
        .from(votes)
        .where(eq(votes.roundId, round.id)),
    ]);
    if (
      shouldAutoReveal(
        eligibleRows.map((row) => row.userId),
        voteRows.map((row) => row.userId),
      )
    ) {
      await tx
        .update(rounds)
        .set({ status: "revealed", revealedAt: new Date() })
        .where(and(eq(rounds.id, round.id), eq(rounds.status, "voting")));
      await tx.insert(auditEvents).values({
        sessionId: input.sessionId,
        actorUserId: input.userId,
        eventType: "round.auto_revealed",
        metadata: { roundId: round.id },
      });
    }
  });
  await broadcastSessionChanged(input.sessionId, "vote-updated");
}

export async function revealRound(sessionId: string, userId: string) {
  await requireFacilitator(sessionId, userId);
  const [round] = await db
    .update(rounds)
    .set({ status: "revealed", revealedAt: new Date() })
    .where(
      and(eq(rounds.sessionId, sessionId), eq(rounds.status, "voting")),
    )
    .returning();
  if (round) await audit(sessionId, userId, "round.revealed", { roundId: round.id });
  await broadcastSessionChanged(sessionId, "round-revealed");
}

export async function revoteRound(sessionId: string, userId: string) {
  const { session } = await requireFacilitator(sessionId, userId);
  if (!session.activeQueueItemId) throw new Error("No active issue");
  const [item] = await db
    .select()
    .from(queueItems)
    .where(eq(queueItems.id, session.activeQueueItemId))
    .limit(1);
  if (!item) throw new Error("Active issue not found");

  await db.transaction(async (tx) => {
    await tx
      .update(rounds)
      .set({ status: "abandoned" })
      .where(
        and(
          eq(rounds.sessionId, sessionId),
          inArray(rounds.status, ["voting", "revealed"]),
        ),
      );
    await createRound(tx, session, item.id, item.currentEstimate);
    await tx.insert(auditEvents).values({
      sessionId,
      actorUserId: userId,
      eventType: "round.revote",
      metadata: { queueItemId: item.id },
    });
  });
  await broadcastSessionChanged(sessionId, "round-revoted");
}

export async function setParticipantRole(input: {
  sessionId: string;
  actorUserId: string;
  participantUserId: string;
  role: ParticipantRole;
  addToCurrentRound?: boolean;
}) {
  await requireFacilitator(input.sessionId, input.actorUserId);
  const targetMembership = await requireMembership(
    input.sessionId,
    input.participantUserId,
  );
  if (
    targetMembership.role === "facilitator" &&
    input.role !== "facilitator"
  ) {
    const facilitatorRows = await db
      .select({ userId: participants.userId })
      .from(participants)
      .where(
        and(
          eq(participants.sessionId, input.sessionId),
          eq(participants.role, "facilitator"),
        ),
      );
    if (facilitatorRows.length === 1) {
      throw new Error("A session must keep at least one facilitator");
    }
  }
  await db.transaction(async (tx) => {
    await tx
      .update(participants)
      .set({ role: input.role, updatedAt: new Date() })
      .where(
        and(
          eq(participants.sessionId, input.sessionId),
          eq(participants.userId, input.participantUserId),
        ),
      );

    const [round] = await tx
      .select()
      .from(rounds)
      .where(
        and(
          eq(rounds.sessionId, input.sessionId),
          eq(rounds.status, "voting"),
        ),
      )
      .orderBy(desc(rounds.createdAt))
      .limit(1);
    if (round) {
      if (
        input.addToCurrentRound &&
        input.role === "voter"
      ) {
        await tx
          .insert(roundVoters)
          .values({
            roundId: round.id,
            userId: input.participantUserId,
          })
          .onConflictDoNothing();
      } else if (input.role !== "voter") {
        await tx
          .delete(roundVoters)
          .where(
            and(
              eq(roundVoters.roundId, round.id),
              eq(roundVoters.userId, input.participantUserId),
            ),
          );
      }
      const [eligibleRows, voteRows] = await Promise.all([
        tx
          .select({ userId: roundVoters.userId })
          .from(roundVoters)
          .innerJoin(
            participants,
            and(
              eq(participants.sessionId, input.sessionId),
              eq(participants.userId, roundVoters.userId),
              eq(participants.role, "voter"),
            ),
          )
          .where(eq(roundVoters.roundId, round.id)),
        tx
          .select({ userId: votes.userId })
          .from(votes)
          .where(eq(votes.roundId, round.id)),
      ]);
      if (
        shouldAutoReveal(
          eligibleRows.map((row) => row.userId),
          voteRows.map((row) => row.userId),
        )
      ) {
        await tx
          .update(rounds)
          .set({ status: "revealed", revealedAt: new Date() })
          .where(and(eq(rounds.id, round.id), eq(rounds.status, "voting")));
        await tx.insert(auditEvents).values({
          sessionId: input.sessionId,
          actorUserId: input.actorUserId,
          eventType: "round.auto_revealed",
          metadata: { roundId: round.id, reason: "roster_changed" },
        });
      }
    }
    await tx.insert(auditEvents).values({
      sessionId: input.sessionId,
      actorUserId: input.actorUserId,
      eventType: "participant.role_changed",
      metadata: {
        participantUserId: input.participantUserId,
        role: input.role,
      },
    });
  });
  await broadcastSessionChanged(input.sessionId, "participant-role-updated");
}

export async function activateQueueItem(input: {
  sessionId: string;
  userId: string;
  queueItemId: string;
}) {
  const { session } = await requireFacilitator(input.sessionId, input.userId);
  const [target] = await db
    .select()
    .from(queueItems)
    .where(
      and(
        eq(queueItems.id, input.queueItemId),
        eq(queueItems.sessionId, input.sessionId),
      ),
    )
    .limit(1);
  if (!target) throw new Error("Issue not found in this session");

  const refreshed = await getLinearIssue(input.userId, target.linearIssueId);
  requirePointableIssue(refreshed);
  await db.transaction(async (tx) => {
    await tx
      .update(rounds)
      .set({ status: "abandoned" })
      .where(
        and(
          eq(rounds.sessionId, input.sessionId),
          inArray(rounds.status, ["voting", "revealed"]),
        ),
      );
    await tx
      .update(queueItems)
      .set({ status: "pending", updatedAt: new Date() })
      .where(
        and(
          eq(queueItems.sessionId, input.sessionId),
          eq(queueItems.status, "active"),
          ne(queueItems.id, target.id),
        ),
      );
    await tx
      .update(queueItems)
      .set({
        status: "active",
        title: refreshed.title,
        description: refreshed.description,
        priorityLabel: refreshed.priorityLabel,
        stateName: refreshed.stateName,
        assigneeName: refreshed.assigneeName,
        projectName: refreshed.projectName,
        labels: refreshed.labels,
        subIssues: refreshed.subIssues,
        attachments: refreshed.attachments,
        currentEstimate: refreshed.estimate,
        updatedAt: new Date(),
      })
      .where(eq(queueItems.id, target.id));
    await tx
      .update(pokerSessions)
      .set({
        activeQueueItemId: target.id,
        status: "live",
        endedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(pokerSessions.id, input.sessionId));
    await createRound(tx, session, target.id, refreshed.estimate);
  });
  await broadcastSessionChanged(input.sessionId, "issue-activated");
}

export async function skipActiveItem(sessionId: string, userId: string) {
  const { session } = await requireFacilitator(sessionId, userId);
  if (!session.activeQueueItemId) throw new Error("No active issue");
  const queue = await db
    .select({
      id: queueItems.id,
      linearIssueId: queueItems.linearIssueId,
      position: queueItems.position,
      status: queueItems.status,
      currentEstimate: queueItems.currentEstimate,
    })
    .from(queueItems)
    .where(eq(queueItems.sessionId, sessionId));
  const nextId = nextPendingItemId(queue, session.activeQueueItemId);
  const nextQueueItem = nextId
    ? queue.find((item) => item.id === nextId) ?? null
    : null;
  const refreshedNext = nextQueueItem
    ? await getLinearIssue(userId, nextQueueItem.linearIssueId)
    : null;
  if (refreshedNext) requirePointableIssue(refreshedNext);

  await db.transaction(async (tx) => {
    await tx
      .update(rounds)
      .set({ status: "abandoned" })
      .where(
        and(
          eq(rounds.sessionId, sessionId),
          inArray(rounds.status, ["voting", "revealed"]),
        ),
      );
    await tx
      .update(queueItems)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(eq(queueItems.id, session.activeQueueItemId!));
    if (nextId) {
      await tx
        .update(queueItems)
        .set({
          status: "active",
          title: refreshedNext!.title,
          description: refreshedNext!.description,
          priorityLabel: refreshedNext!.priorityLabel,
          stateName: refreshedNext!.stateName,
          assigneeName: refreshedNext!.assigneeName,
          projectName: refreshedNext!.projectName,
          labels: refreshedNext!.labels,
          subIssues: refreshedNext!.subIssues,
          attachments: refreshedNext!.attachments,
          currentEstimate: refreshedNext!.estimate,
          updatedAt: new Date(),
        })
        .where(eq(queueItems.id, nextId));
      await tx
        .update(pokerSessions)
        .set({ activeQueueItemId: nextId, updatedAt: new Date() })
        .where(eq(pokerSessions.id, sessionId));
      await createRound(tx, session, nextId, refreshedNext!.estimate);
    } else {
      await tx
        .update(pokerSessions)
        .set({
          activeQueueItemId: null,
          status: "ended",
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pokerSessions.id, sessionId));
      await tx.insert(auditEvents).values({
        sessionId,
        actorUserId: userId,
        eventType: "session.ended",
        metadata: { reason: "queue_exhausted" },
      });
    }
    await tx.insert(auditEvents).values({
      sessionId,
      actorUserId: userId,
      eventType: "issue.skipped",
      metadata: { queueItemId: session.activeQueueItemId },
    });
  });
  await broadcastSessionChanged(sessionId, "issue-skipped");
}

export async function finalizeEstimate(input: {
  sessionId: string;
  userId: string;
  estimate: number;
  overwrite?: boolean;
}) {
  const { session } = await requireFacilitator(input.sessionId, input.userId);
  if (!session.activeQueueItemId) throw new Error("No active issue");
  const [item] = await db
    .select()
    .from(queueItems)
    .where(eq(queueItems.id, session.activeQueueItemId))
    .limit(1);
  const [round] = await db
    .select()
    .from(rounds)
    .where(
      and(
        eq(rounds.queueItemId, session.activeQueueItemId),
        eq(rounds.status, "revealed"),
      ),
    )
    .orderBy(desc(rounds.createdAt))
    .limit(1);
  if (!item || !round) throw new Error("Reveal the round before finalizing");

  if (!isFinalizableEstimate(input.estimate, POINTING_CARDS)) {
    throw new Error("Final estimate must be 0, 1, 2, 3, or 4");
  }

  let attemptedWriteback = false;
  try {
    const changed = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from rounds where id = ${round.id} for update`,
      );
      const [lockedRound] = await tx
        .select()
        .from(rounds)
        .where(eq(rounds.id, round.id))
        .limit(1);
      if (!lockedRound || lockedRound.status === "finalized") return false;
      if (lockedRound.status !== "revealed") {
        throw new Error("Round is no longer ready to finalize");
      }

      const latest = await getLinearIssue(input.userId, item.linearIssueId);
      requireTodoIssue(latest);
      if (
        latest.estimate !== lockedRound.estimateAtStart &&
        latest.estimate !== input.estimate &&
        !input.overwrite
      ) {
        throw new Error(
          `CONFLICT:Linear now has estimate ${latest.estimate ?? "none"}; confirm overwrite to continue.`,
        );
      }
      attemptedWriteback = true;
      await updateLinearIssueEstimate(
        input.userId,
        item.linearIssueId,
        input.estimate,
      );

      const queue = await tx
        .select({
          id: queueItems.id,
          linearIssueId: queueItems.linearIssueId,
          position: queueItems.position,
          status: queueItems.status,
          currentEstimate: queueItems.currentEstimate,
        })
        .from(queueItems)
        .where(eq(queueItems.sessionId, input.sessionId));
      const nextId = nextPendingItemId(queue, item.id);

      await tx
        .update(rounds)
        .set({ status: "finalized", finalizedAt: new Date() })
        .where(eq(rounds.id, round.id));
      await tx
        .update(queueItems)
        .set({
          status: "estimated",
          currentEstimate: input.estimate,
          finalEstimate: input.estimate,
          updatedAt: new Date(),
        })
        .where(eq(queueItems.id, item.id));

      if (nextId) {
        const next = queue.find((candidate) => candidate.id === nextId)!;
        const refreshedNext = await getLinearIssue(
          input.userId,
          next.linearIssueId,
        );
        await tx
          .update(queueItems)
          .set({
            status: "active",
            title: refreshedNext.title,
            description: refreshedNext.description,
            priorityLabel: refreshedNext.priorityLabel,
            stateName: refreshedNext.stateName,
            assigneeName: refreshedNext.assigneeName,
            projectName: refreshedNext.projectName,
            labels: refreshedNext.labels,
            subIssues: refreshedNext.subIssues,
            attachments: refreshedNext.attachments,
            currentEstimate: refreshedNext.estimate,
            updatedAt: new Date(),
          })
          .where(eq(queueItems.id, nextId));
        await tx
          .update(pokerSessions)
          .set({ activeQueueItemId: nextId, updatedAt: new Date() })
          .where(eq(pokerSessions.id, input.sessionId));
        await createRound(tx, session, nextId, refreshedNext.estimate);
      } else {
        await tx
          .update(pokerSessions)
          .set({
            activeQueueItemId: null,
            status: "ended",
            endedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pokerSessions.id, input.sessionId));
        await tx.insert(auditEvents).values({
          sessionId: input.sessionId,
          actorUserId: input.userId,
          eventType: "session.ended",
          metadata: {},
        });
      }
      await tx.insert(auditEvents).values([
        {
          sessionId: input.sessionId,
          actorUserId: input.userId,
          eventType: "linear.writeback_succeeded",
          metadata: {
            linearIssueId: item.linearIssueId,
            estimate: input.estimate,
          },
        },
        {
          sessionId: input.sessionId,
          actorUserId: input.userId,
          eventType: "estimate.finalized",
          metadata: {
            queueItemId: item.id,
            linearIssueId: item.linearIssueId,
            estimate: input.estimate,
          },
        },
      ]);
      return true;
    });
    if (changed) {
      await broadcastSessionChanged(input.sessionId, "estimate-finalized");
    }
  } catch (error) {
    if (attemptedWriteback) {
      await audit(
        input.sessionId,
        input.userId,
        "linear.writeback_failed",
        {
          linearIssueId: item.linearIssueId,
          message:
            error instanceof Error ? error.message.slice(0, 300) : "Unknown",
        },
      ).catch(() => undefined);
    }
    throw error;
  }
}

export async function userCanJoinRealtimeChannel(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  try {
    await requireMembership(sessionId, userId);
    return true;
  } catch {
    return false;
  }
}

export async function deletePokerSession(
  sessionId: string,
  userId: string,
): Promise<void> {
  await requireFacilitator(sessionId, userId);
  await db.delete(pokerSessions).where(eq(pokerSessions.id, sessionId));
}
