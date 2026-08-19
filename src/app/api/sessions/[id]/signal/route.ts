import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { getSessionSnapshot, setRoundSignal } from "@/lib/sessions";

const signalSchema = z.object({
  signal: z.literal("needs-context").nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }, input] = await Promise.all([
      requireCurrentUser(),
      params,
      request.json().then((value) => signalSchema.parse(value)),
    ]);
    await setRoundSignal({
      sessionId: id,
      userId: user.id,
      signal: input.signal,
    });
    return Response.json({
      success: true,
      snapshot: await getSessionSnapshot(id, user.id),
    });
  } catch (error) {
    return apiError(error);
  }
}
