import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import {
  activateQueueItem,
  finalizeEstimate,
  finishPokerSession,
  getSessionSnapshot,
  recordGroomingOutcome,
  refreshActiveIssuePreview,
  revealRound,
  revoteRound,
  setParticipantRole,
  skipActiveItem,
} from "@/lib/sessions";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reveal") }),
  z.object({ action: z.literal("revote") }),
  z.object({ action: z.literal("skip") }),
  z.object({ action: z.literal("refresh-issue") }),
  z.object({ action: z.literal("finish") }),
  z.object({
    action: z.literal("outcome"),
    outcome: z.enum(["needs-work", "split", "parked"]),
    note: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("activate"),
    queueItemId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("finalize"),
    estimate: z.number().int().nonnegative(),
    note: z.string().trim().max(2000).optional(),
    overwrite: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("participant-role"),
    participantUserId: z.string().uuid(),
    role: z.enum(["facilitator", "voter", "observer"]),
    votingEnabled: z.boolean().optional(),
    addToCurrentRound: z.boolean().optional(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const input = actionSchema.parse(await request.json());
    switch (input.action) {
      case "reveal":
        await revealRound(id, user.id);
        break;
      case "revote":
        await revoteRound(id, user.id);
        break;
      case "skip":
        await skipActiveItem(id, user.id);
        break;
      case "refresh-issue":
        await refreshActiveIssuePreview(id, user.id);
        break;
      case "finish":
        await finishPokerSession(id, user.id);
        break;
      case "outcome":
        await recordGroomingOutcome({
          sessionId: id,
          userId: user.id,
          outcome: input.outcome,
          note: input.note,
        });
        break;
      case "activate":
        await activateQueueItem({
          sessionId: id,
          userId: user.id,
          queueItemId: input.queueItemId,
        });
        break;
      case "finalize":
        await finalizeEstimate({
          sessionId: id,
          userId: user.id,
          estimate: input.estimate,
          note: input.note,
          overwrite: input.overwrite,
        });
        break;
      case "participant-role":
        await setParticipantRole({
          sessionId: id,
          actorUserId: user.id,
          participantUserId: input.participantUserId,
          role: input.role,
          votingEnabled: input.votingEnabled,
          addToCurrentRound: input.addToCurrentRound,
        });
        break;
    }
    return Response.json({
      success: true,
      snapshot: await getSessionSnapshot(id, user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}
