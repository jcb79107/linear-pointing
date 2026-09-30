import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { participants, pokerSessions, queueItems } from "@/db/schema";
import type { TeamDefaults } from "@/lib/domain";
import { loadIntakeIssues, resolveSessionIntake } from "@/lib/linear";
import { requireFacilitator } from "@/lib/sessions";
import { isPointableLinearIssue } from "@/lib/pointing-eligibility";
import { teamDefaultsSchema } from "@/lib/team-defaults";

// Remote reads finish before the transaction. A failure preserves the existing agenda.
export async function loadSessionAgenda(
  sessionId: string,
  userId: string,
  input: TeamDefaults,
) {
  const settings = teamDefaultsSchema.parse(input);
  const { session } = await requireFacilitator(sessionId, userId);
  if (session.status !== "draft")
    throw new Error("UNPROCESSABLE:Only draft agendas can be replaced");
  const before = await db
    .select()
    .from(queueItems)
    .where(eq(queueItems.sessionId, sessionId))
    .orderBy(asc(queueItems.position));
  const intake =
    session.intake?.cycleOffset === settings.cycleOffset
      ? session.intake
      : await resolveSessionIntake(
          userId,
          session.teamId,
          settings.cycleOffset,
        );
  const issues = await loadIntakeIssues(userId, session.teamId, intake);
  if (issues.length > 1000)
    throw new Error(
      "UNPROCESSABLE:This source has more than 1,000 unestimated tickets. Move a smaller set into a cycle in Linear.",
    );
  if (issues.some(issue => issue.teamId !== session.teamId)) throw new Error("FORBIDDEN");
  const eligible = issues.filter(issue => isPointableLinearIssue(issue, { stateTypes: ["backlog", "unstarted", "started", "triage"], estimateScope: "unestimated" }));
  const ordered = [...eligible].sort((a, b) => {
    if (settings.defaultSort === "priority")
      return (a.priority || 5) - (b.priority || 5) || a.sortOrder - b.sortOrder;
    if (settings.defaultSort === "oldest")
      return (
        Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
        a.sortOrder - b.sortOrder
      );
    return a.sortOrder - b.sortOrder;
  });
  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select()
      .from(pokerSessions)
      .where(eq(pokerSessions.id, sessionId))
      .for("update");
    if (locked.status !== "draft")
      throw new Error(
        "UNPROCESSABLE:The session has started. Reload the room.",
      );
    const current = await tx
      .select()
      .from(queueItems)
      .where(eq(queueItems.sessionId, sessionId))
      .orderBy(asc(queueItems.position));
    const signature = (rows: typeof before) =>
      rows.map((r) => `${r.id}:${r.position}`).join(",");
    if (
      +locked.updatedAt !== +session.updatedAt ||
      signature(current) !== signature(before)
    )
      throw new Error(
        "UNPROCESSABLE:The agenda changed while tickets were loading. Reload before trying again.",
      );
    await tx.delete(queueItems).where(eq(queueItems.sessionId, sessionId));
    if (ordered.length)
      await tx.insert(queueItems).values(
        ordered.map((issue, position) => ({
          sessionId,
          linearIssueId: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          description: issue.description,
          url: issue.url,
          priorityLabel: issue.priorityLabel,
          priority: issue.priority,
          linearSortOrder: issue.sortOrder,
          stateName: issue.stateName,
          position,
          currentEstimate: issue.estimate,
          linearCreatedAt: new Date(issue.createdAt),
          linearUpdatedAt: new Date(issue.updatedAt),
        })),
      );
    await tx
      .update(pokerSessions)
      .set({
        intake,
        defaults: settings,
        autoReveal: settings.autoReveal,
        updatedAt: new Date(),
      })
      .where(eq(pokerSessions.id, sessionId));
    await tx
      .update(participants)
      .set({ votingEnabled: settings.facilitatorVotes })
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.role, "facilitator"),
        ),
      );
  });
}

export async function updateDraftDefaults(
  sessionId: string,
  userId: string,
  input: TeamDefaults,
) {
  const settings = teamDefaultsSchema.parse(input);
  await requireFacilitator(sessionId, userId);
  await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(pokerSessions)
      .where(eq(pokerSessions.id, sessionId))
      .for("update");
    if (session.status !== "draft")
      throw new Error("UNPROCESSABLE:Only draft settings can be changed");
    if (session.intake && session.intake.cycleOffset !== settings.cycleOffset)
      throw new Error("UNPROCESSABLE:Load the selected cycle before starting.");
    await tx
      .update(pokerSessions)
      .set({
        defaults: settings,
        autoReveal: settings.autoReveal,
        updatedAt: new Date(),
      })
      .where(eq(pokerSessions.id, sessionId));
    await tx
      .update(participants)
      .set({ votingEnabled: settings.facilitatorVotes })
      .where(
        and(
          eq(participants.sessionId, sessionId),
          eq(participants.role, "facilitator"),
        ),
      );
  });
}
