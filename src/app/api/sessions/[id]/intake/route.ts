import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { loadSessionAgenda, updateDraftDefaults } from "@/lib/session-intake";
import { getSessionSnapshot } from "@/lib/sessions";
import { teamDefaultsSchema } from "@/lib/team-defaults";
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { id } = await params;
    await loadSessionAgenda(
      id,
      user.id,
      teamDefaultsSchema.parse(await request.json()),
    );
    return Response.json({ snapshot: await getSessionSnapshot(id, user.id) });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { id } = await params;
    await updateDraftDefaults(
      id,
      user.id,
      teamDefaultsSchema.parse(await request.json()),
    );
    return Response.json({ snapshot: await getSessionSnapshot(id, user.id) });
  } catch (error) {
    return apiError(error);
  }
}
