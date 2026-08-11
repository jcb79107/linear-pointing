import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getSessionSnapshot } from "@/lib/sessions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [user, { id }] = await Promise.all([
      requireCurrentUser(),
      params,
    ]);
    const snapshot = await getSessionSnapshot(id, user.id);
    return Response.json({ snapshot });
  } catch (error) {
    return apiError(error);
  }
}
