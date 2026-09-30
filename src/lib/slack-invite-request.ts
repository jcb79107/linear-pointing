import { requestJson } from "./client-request";
import { z } from "zod";

const responseSchema = z.object({ success: z.boolean().optional(), error: z.string().optional() });
const uncertainDelivery = "Slack delivery could not be confirmed. Check the channel before trying again, or copy the invite.";

export async function requestSlackInvite(sessionId: string, connectionId: string) {
  const { response, data } = await requestJson<unknown>(`/api/sessions/${sessionId}/slack-invite`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId }),
  }, 15000).catch(() => {
    // The server may have sent the invite even if the browser lost the response.
    throw new Error(uncertainDelivery);
  });
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new Error(uncertainDelivery);
  if (!response.ok) throw new Error(parsed.data.error || uncertainDelivery);
  if (parsed.data.success !== true) throw new Error(uncertainDelivery);
}
