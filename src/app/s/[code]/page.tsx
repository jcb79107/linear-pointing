import { redirect } from "next/navigation";

import { JoinSession } from "@/components/JoinSession";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/api/auth/linear/start?returnTo=${encodeURIComponent(`/s/${code}`)}`,
    );
  }
  return <JoinSession code={code} />;
}
