import { z } from "zod";

import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import {
  getLinearIssueFilterOptions,
  searchLinearCustomViewIssues,
  searchLinearIssues,
} from "@/lib/linear";

const querySchema = z.object({
  teamId: z.string().min(1),
  query: z.string().max(200).optional(),
  cycleId: z.string().optional(),
  projectId: z.string().optional(),
  labelId: z.string().optional(),
  customViewId: z.string().optional(),
  all: z.enum(["true", "false"]).optional(),
  cycleScope: z.enum(["upcoming", "active", "any"]).default("any"),
  stateTypes: z.string().default("unstarted"),
  estimateScope: z
    .enum(["unestimated", "estimated", "any"])
    .default("unestimated"),
  assigneeScope: z
    .enum(["anyone", "me", "unassigned"])
    .default("anyone"),
});

export async function GET(request: Request) {
  try {
    const user = await requireCurrentUser();
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const input = querySchema.parse(raw);
    const stateTypes = input.stateTypes
      .split(",")
      .filter((value): value is "backlog" | "unstarted" | "started" =>
        ["backlog", "unstarted", "started"].includes(value),
      );
    if (!stateTypes.length) {
      return Response.json(
        { error: "Choose at least one Linear status" },
        { status: 400 },
      );
    }
    const cycleOptions =
      input.cycleScope === "any"
        ? null
        : await getLinearIssueFilterOptions(user.id, input.teamId, {
            includeCustomViews: false,
          });
    const selectedCycle =
      input.cycleScope === "upcoming"
        ? cycleOptions?.upcomingCycle
        : input.cycleScope === "active"
          ? cycleOptions?.activeCycle
          : null;
    if (input.cycleScope !== "any" && !selectedCycle) {
      return Response.json({ issues: [], selectedCycle: null });
    }
    const fetchAll = input.all === "true";
    const filters = {
      teamId: input.teamId,
      query: input.query,
      cycleId: selectedCycle?.id ?? input.cycleId,
      projectId: input.projectId,
      labelId: input.labelId,
      stateTypes,
      estimateScope: input.estimateScope,
      assigneeScope: input.assigneeScope,
      assigneeId: user.linearUserId,
    };
    const issues = input.customViewId
      ? await searchLinearCustomViewIssues(
          user.id,
          input.customViewId,
          filters,
          { fetchAll },
        )
      : await searchLinearIssues(user.id, filters, {
          fetchAll,
          preserveManualOrder: fetchAll,
        });
    return Response.json({ issues, selectedCycle });
  } catch (error) {
    return apiError(error);
  }
}
