import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { castVote, getSessionSnapshot } from "@/lib/sessions";

const voteSchema = z.object({
  value: z.number().int().min(0).max(100),
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
