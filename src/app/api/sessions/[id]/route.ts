import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { deletePokerSession } from "@/lib/sessions";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    await deletePokerSession(id, user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
