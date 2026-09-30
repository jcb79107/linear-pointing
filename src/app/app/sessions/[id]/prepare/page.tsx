import { notFound, redirect } from "next/navigation";

import { QueueBuilder } from "@/components/QueueBuilder";
import { getCurrentUser } from "@/lib/auth";
import { getSessionSnapshot } from "@/lib/sessions";
import { getTeamDefaults } from "@/lib/team-settings";

export const dynamic = "force-dynamic";

export default async function PrepareSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) redirect(`/api/auth/linear/start?returnTo=/app/sessions/${id}/prepare`);

  let snapshot;
  let settings;
  try {
    snapshot = await getSessionSnapshot(id, user.id);
    settings = snapshot.defaults ?? await getTeamDefaults(user, snapshot.teamId);
  } catch {
    notFound();
  }
  if (snapshot.currentUserRole !== "facilitator") redirect(`/sessions/${id}`);
  if (snapshot.status !== "draft") redirect(`/sessions/${id}`);
  return <QueueBuilder initialSnapshot={snapshot} settings={settings} />;
}
