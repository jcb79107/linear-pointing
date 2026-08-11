import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import {
  getUpcomingLinearCycle,
  searchLinearIssues,
} from "@/lib/linear";

const querySchema = z.object({
  teamId: z.string().min(1),
  query: z.string().max(200).optional(),
  cycleId: z.string().optional(),
  projectId: z.string().optional(),
  labelId: z.string().optional(),
  all: z.enum(["true", "false"]).optional(),
  upcoming: z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const input = querySchema.parse(raw);
    const upcomingCycle =
      input.upcoming === "true"
        ? await getUpcomingLinearCycle(user.id, input.teamId)
        : null;
    if (input.upcoming === "true" && !upcomingCycle) {
      return Response.json({ issues: [], upcomingCycle: null });
    }
    const fetchAll = input.all === "true" || input.upcoming === "true";
    const issues = await searchLinearIssues(
      user.id,
      {
        teamId: input.teamId,
        query: input.query,
        cycleId: upcomingCycle?.id ?? input.cycleId,
        projectId: input.projectId,
        labelId: input.labelId,
      },
      { fetchAll, preserveManualOrder: fetchAll },
    );
    return Response.json({ issues, upcomingCycle });
  } catch (error) {
    return apiError(error);
  }
}
