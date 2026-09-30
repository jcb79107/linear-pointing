import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { teamDefaults } from "@/db/schema";
import { userHasTeamAccess } from "@/lib/linear";
import { DEFAULT_TEAM_DEFAULTS, teamDefaultsSchema } from "@/lib/team-defaults";
import type { TeamDefaults } from "@/lib/domain";

type Actor = { id: string; organizationId: string };
async function authorize(actor: Actor, teamId: string) {
  if (!(await userHasTeamAccess(actor.id, teamId)))
    throw new Error("FORBIDDEN");
}
export async function getTeamDefaults(
  actor: Actor,
  teamId: string,
): Promise<TeamDefaults> {
  await authorize(actor, teamId);
  const [row] = await db
    .select()
    .from(teamDefaults)
    .where(
      and(
        eq(teamDefaults.organizationId, actor.organizationId),
        eq(teamDefaults.teamId, teamId),
      ),
    )
    .limit(1);
  return row
    ? teamDefaultsSchema.parse(row.settings)
    : { ...DEFAULT_TEAM_DEFAULTS };
}
export async function saveTeamDefaults(
  actor: Actor,
  teamId: string,
  input: TeamDefaults,
) {
  await authorize(actor, teamId);
  const settings = teamDefaultsSchema.parse(input);
  await db
    .insert(teamDefaults)
    .values({ organizationId: actor.organizationId, teamId, settings })
    .onConflictDoUpdate({
      target: [teamDefaults.organizationId, teamDefaults.teamId],
      set: { settings, updatedAt: new Date() },
    });
  return settings;
}
