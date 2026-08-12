import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { castVote, getSessionSnapshot } from "@/lib/sessions";

const voteSchema = z.object({
  value: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
});

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
    const input = voteSchema.parse(await request.json());
    await castVote({ sessionId: id, userId: user.id, value: input.value });
    return Response.json({
      success: true,
      snapshot: await getSessionSnapshot(id, user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}
