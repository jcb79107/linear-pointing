import * as Sentry from "@sentry/nextjs";

export async function sendPointedFeedback(message: string, email: string, screenshot?: File) {
  const client = Sentry.getClient();
  if (!client?.getDsn()) throw new Error("Feedback is unavailable. Please use the support page.");
  const replay = Sentry.getReplay();
  const replayId = replay?.getReplayId();
  const attachments = screenshot ? [{ filename: `screenshot.${screenshot.type === "image/jpeg" ? "jpg" : screenshot.type === "image/webp" ? "webp" : "png"}`, contentType: screenshot.type, data: new Uint8Array(await screenshot.arrayBuffer()) }] : undefined;
  let removeListener: (() => void) | undefined;
  try {
    // Submission is the consent boundary. Never upload on opening/canceling the form.
    if (replayId) await replay?.flush({ continueRecording: false });
    removeListener = client.on("beforeSendFeedback", (event) => {
      if (replayId && event.contexts?.feedback) event.contexts.feedback.replay_id = replayId;
    });
    await Sentry.sendFeedback({ message, email: email || undefined }, { includeReplay: false, attachments });
  } finally {
    removeListener?.();
    // Return to buffering; submitting one report never enables ongoing uploads.
    await replay?.stop({ flush: false });
    replay?.startBuffering();
  }
}
