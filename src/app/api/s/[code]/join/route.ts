import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { joinPokerSession } from "@/lib/sessions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { code }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const session = await joinPokerSession(code, user);
    return Response.json({ sessionId: session.id });
  } catch (error) {
    return apiError(error);
  }
}
