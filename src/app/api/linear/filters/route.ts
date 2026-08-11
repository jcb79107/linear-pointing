import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getLinearIssueFilterOptions } from "@/lib/linear";

const querySchema = z.object({ teamId: z.string().min(1) });

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const input = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json({
      filters: await getLinearIssueFilterOptions(user.id, input.teamId),
    });
  } catch (error) {
    return apiError(error);
  }
}
