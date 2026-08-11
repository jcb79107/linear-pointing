import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { isDefaultFacilitatorEmail } from "@/lib/facilitators";
import { getLinearTeam, hasLinearWriteScope } from "@/lib/linear";
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
    if (!isDefaultFacilitatorEmail(user.email)) {
      return Response.json(
        {
          error:
            "Ask a configured facilitator to create the session. They can promote you after you join.",
        },
        { status: 403 },
      );
    }
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
    const team = await getLinearTeam(user.id, input.teamId);
    const session = await createPokerSession({
      userId: user.id,
      organizationId: user.organizationId,
      title: input.title,
      team,
    });
    return Response.json({ session }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
