import { notFound, redirect } from "next/navigation";

import { LiveRoom } from "@/components/LiveRoom";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { getSessionSnapshot } from "@/lib/sessions";

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
  try {
    snapshot = await getSessionSnapshot(id, user.id);
  } catch {
    notFound();
  }
  return (
    <LiveRoom
      initialSnapshot={snapshot}
      slackInviteChannel={getServerEnv().SLACK_INVITE_CHANNEL}
    />
  );
}
