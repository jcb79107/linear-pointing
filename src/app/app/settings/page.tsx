import { redirect } from "next/navigation";

import { SettingsClient } from "@/components/SettingsClient";
import { getCurrentUser } from "@/lib/auth";
import { hasLinearWriteScope, listLinearTeams } from "@/lib/linear";
import { getTeamDefaults } from "@/lib/team-settings";

export const dynamic = "force-dynamic";

const slackNotices: Record<string, string> = {
  connected: "Slack connected. You can now send an invite from your agenda or room.",
  cancelled: "Slack connection cancelled. Your previous connection is unchanged.",
  expired: "Slack sign-in expired or your Linear account changed. Connect Slack again.",
  failed: "Slack could not connect. Try again, ask your Slack administrator, or use an incoming webhook.",
  unavailable: "Slack sign-in is not configured on this deployment. Use an incoming webhook below.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ slack?: string }> }) {
  const { slack } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/linear/start?returnTo=/app/settings");

  const [teams, hasWriteScope] = await Promise.all([
    listLinearTeams(user.id),
    hasLinearWriteScope(user.id),
  ]);

  const initialDefaults = Object.fromEntries(await Promise.all(teams.map(async team => [team.id, await getTeamDefaults(user, team.id)])));

  return (
    <SettingsClient
      slackNotice={slack ? slackNotices[slack] : undefined}
      hasWriteScope={hasWriteScope}
      initialDefaults={initialDefaults}
      teams={teams}
      user={{ name: user.displayName, email: user.email }}
    />
  );
}
