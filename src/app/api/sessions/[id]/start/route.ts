import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { startPokerSession } from "@/lib/sessions";

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
    await startPokerSession(id, user.id);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
