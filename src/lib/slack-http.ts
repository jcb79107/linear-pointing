import { ZodError } from "zod";
import { apiError } from "@/lib/http";
import { SlackDeliveryError } from "@/lib/slack";

export function slackApiError(error: unknown): Response {
  if (error instanceof ZodError || (error instanceof Error &&
    (["UNAUTHORIZED", "FORBIDDEN"].includes(error.message) || error.message.startsWith("UNPROCESSABLE:")))) return apiError(error);
  if (error instanceof SlackDeliveryError) return Response.json({ error: error.message }, { status: 502 });
  // Database/client errors can include SQL parameters or secrets. Keep both the
  // response and logs free of connection payloads.
  console.warn("Slack connection or delivery operation failed");
  return Response.json({ error: "Slack is unavailable. If you tried to send, check the channel before retrying. You can still copy the invite." }, { status: 503 });
}
