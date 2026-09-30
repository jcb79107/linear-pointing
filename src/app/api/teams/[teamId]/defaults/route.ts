import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { getTeamDefaults, saveTeamDefaults } from "@/lib/team-settings";
import { teamDefaultsSchema } from "@/lib/team-defaults";
type Context = { params: Promise<{ teamId: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireCurrentUser();
    const { teamId } = await params;
    return Response.json({ settings: await getTeamDefaults(user, teamId) });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const { teamId } = await params;
    return Response.json({
      settings: await saveTeamDefaults(
        user,
        teamId,
        teamDefaultsSchema.parse(await request.json()),
      ),
    });
  } catch (error) {
    return apiError(error);
  }
}
