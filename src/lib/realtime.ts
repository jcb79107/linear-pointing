import "server-only";

import Pusher from "pusher";

import { getServerEnv } from "@/lib/env";

let pusher: Pusher | null = null;

function getPusher(): Pusher | null {
  const env = getServerEnv();
  if (
    env.PUSHER_APP_ID === "disabled" ||
    env.PUSHER_KEY === "disabled" ||
    env.PUSHER_SECRET === "disabled"
  ) {
    return null;
  }
  pusher ??= new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.PUSHER_KEY,
    secret: env.PUSHER_SECRET,
    cluster: env.PUSHER_CLUSTER,
    useTLS: true,
  });
  return pusher;
}

export async function broadcastSessionChanged(
  sessionId: string,
  reason: string,
): Promise<void> {
  const client = getPusher();
  if (!client) return;
  try {
    await client.trigger(`presence-session-${sessionId}`, "session-changed", {
      reason,
    });
  } catch (error) {
    // Postgres is canonical and clients poll as a fallback, so a realtime
    // outage must never roll back or disguise an accepted facilitator action.
    console.error("Pusher notification failed", error);
  }
}

export function authorizePresenceChannel(
  socketId: string,
  channelName: string,
  user: { id: string; displayName: string; avatarUrl: string | null },
) {
  const client = getPusher();
  if (!client) throw new Error("Realtime is not configured");
  return client.authorizeChannel(socketId, channelName, {
    user_id: user.id,
  });
}
