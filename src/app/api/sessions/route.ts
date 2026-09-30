import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { resolvePointingCards } from "@/lib/estimates";
import { getLinearTeam, hasLinearWriteScope } from "@/lib/linear";
import { getTeamDefaults } from "@/lib/team-settings";
import { createPokerSession, listPokerSessions } from "@/lib/sessions";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  teamId: z.string().min(1),
});

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const sessions = await listPokerSessions(user.id, user.organizationId);
    return Response.json({ sessions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    if (!(await hasLinearWriteScope(user.id))) {
      return Response.json(
        {
          error: "Linear write permission is required",
          upgradeUrl: `/api/auth/linear/start?write=true&returnTo=/app`,
        },
        { status: 403 },
      );
    }
    const input = createSessionSchema.parse(await request.json());
    const [team, settings] = await Promise.all([
      getLinearTeam(user.id, input.teamId),
      getTeamDefaults(user, input.teamId),
    ]);
    let pointingCards;
    try {
      pointingCards = resolvePointingCards({ pointingPreset: "linear-team", customPointValues: [] }, team);
    } catch (error) {
      throw new Error(
        `UNPROCESSABLE:${
          error instanceof Error ? error.message : "The pointing deck is not compatible with this Linear team"
        }`,
      );
    }
    const session = await createPokerSession({
      userId: user.id,
      organizationId: user.organizationId,
      title: input.title,
      team,
      pointingCards,
      autoReveal: settings.autoReveal,
      defaults: settings,
    });
    return Response.json({ session }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
