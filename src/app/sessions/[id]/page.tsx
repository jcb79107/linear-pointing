import { notFound, redirect } from "next/navigation";

import { LiveRoom } from "@/components/LiveRoom";
import { getCurrentUser } from "@/lib/auth";
import { getSessionSnapshot } from "@/lib/sessions";
import { getUserSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/api/auth/linear/start?returnTo=/sessions/${id}`);
  }
  let snapshot;
  let settings;
  try {
    [snapshot, settings] = await Promise.all([
      getSessionSnapshot(id, user.id),
      getUserSettings(user.id),
    ]);
  } catch {
    notFound();
  }
  return <LiveRoom initialSnapshot={snapshot} intakeDefaults={settings} />;
}
