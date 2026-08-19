import { redirect } from "next/navigation";

import { SettingsClient } from "@/components/SettingsClient";
import { getCurrentUser } from "@/lib/auth";
import { hasLinearWriteScope, listLinearTeams } from "@/lib/linear";
import { getUserSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/linear/start?returnTo=/app/settings");

  const [teams, settings, hasWriteScope] = await Promise.all([
    listLinearTeams(user.id),
    getUserSettings(user.id),
    hasLinearWriteScope(user.id),
  ]);

  return (
    <SettingsClient
      hasWriteScope={hasWriteScope}
      initialSettings={settings}
      teams={teams}
      user={{ name: user.displayName, email: user.email }}
    />
  );
}
