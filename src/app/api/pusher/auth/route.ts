import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { pokerSessions } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { authorizePresenceChannel } from "@/lib/realtime";
import { requireRealtimeChannelAccess } from "@/lib/sessions";

const inputSchema = z.object({
  socket_id: z.string().min(1),
  channel_name: z
    .string()
    .regex(/^presence-session-[0-9a-f-]{36}$/),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const formData = await request.formData();
    const input = inputSchema.parse(Object.fromEntries(formData));
    const sessionId = input.channel_name.replace("presence-session-", "");
    await requireRealtimeChannelAccess(sessionId, user.id);
    const [session] = await db
      .select({ id: pokerSessions.id })
      .from(pokerSessions)
      .where(eq(pokerSessions.id, sessionId))
      .limit(1);
    if (!session) throw new Error("FORBIDDEN");

    return Response.json(
      authorizePresenceChannel(input.socket_id, input.channel_name, user),
    );
  } catch (error) {
    return apiError(error);
  }
}
