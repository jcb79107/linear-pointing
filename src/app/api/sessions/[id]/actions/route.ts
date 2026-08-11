import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import {
  activateQueueItem,
  finalizeEstimate,
  revealRound,
  revoteRound,
  setParticipantRole,
  skipActiveItem,
} from "@/lib/sessions";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reveal") }),
  z.object({ action: z.literal("revote") }),
  z.object({ action: z.literal("skip") }),
  z.object({
    action: z.literal("activate"),
    queueItemId: z.string().uuid(),
  }),
  z.object({
    action: z.literal("finalize"),
    estimate: z.number().int().nonnegative(),
    overwrite: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("participant-role"),
    participantUserId: z.string().uuid(),
    role: z.enum(["facilitator", "voter", "observer"]),
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
          overwrite: input.overwrite,
        });
        break;
      case "participant-role":
        await setParticipantRole({
          sessionId: id,
          actorUserId: user.id,
          participantUserId: input.participantUserId,
          role: input.role,
          addToCurrentRound: input.addToCurrentRound,
        });
        break;
    }
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
