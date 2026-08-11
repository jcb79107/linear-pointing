import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { searchLinearIssues } from "@/lib/linear";

const querySchema = z.object({
  teamId: z.string().min(1),
  query: z.string().max(200).optional(),
  cycleId: z.string().optional(),
  projectId: z.string().optional(),
  labelId: z.string().optional(),
  all: z.enum(["true", "false"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const input = querySchema.parse(raw);
    const fetchAll = input.all === "true";
    const issues = await searchLinearIssues(
      user.id,
      {
        teamId: input.teamId,
        query: input.query,
        cycleId: input.cycleId,
        projectId: input.projectId,
        labelId: input.labelId,
      },
      { fetchAll },
    );
    return Response.json({ issues });
  } catch (error) {
    return apiError(error);
  }
}
