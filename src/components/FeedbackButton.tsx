"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { sendPointedFeedback } from "@/lib/feedback";

export function FeedbackButton({ compact = false }: { compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [screenshot, setScreenshot] = useState<File>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const message = String(data.get("message") ?? "").trim();
    if (!message) { setError("Tell us what happened or what you’d change."); return; }
    setBusy(true);
    setError("");
    try {
      await sendPointedFeedback(message, String(data.get("email") ?? "").trim(), screenshot);
      dialog.current?.close();
      form.current?.reset();
      setScreenshot(undefined);
      setSent(true);
    } catch {
      setError("Couldn’t send your feedback. Your message is still here—please try again or use Help.");
    } finally { setBusy(false); }
  }

  return <span className="feedback-control">
    <button ref={trigger} type="button" className={compact ? "header-icon-link" : "button button-secondary"} aria-label="Send feedback" title="Send feedback" onClick={() => { setSent(false); dialog.current?.showModal(); }}>
      <MessageSquare size={16} aria-hidden="true" />{!compact && "Send feedback"}
    </button>
    {sent && <span className="feedback-fallback" role="status">Thanks — your feedback was sent.</span>}
    <dialog onClose={() => trigger.current?.focus()} ref={dialog} className="feedback-dialog" aria-labelledby={titleId} aria-describedby={noticeId} onCancel={(event) => { if (busy) event.preventDefault(); }} data-sentry-block>
      <form ref={form} onSubmit={submit}>
        <h2 id={titleId}>Send feedback</h2>
        <label>What happened, or what would you change?<textarea name="message" required maxLength={5000} rows={5} /></label>
        <label><span>Email (optional, for a reply)</span><input name="email" type="email" maxLength={254} autoComplete="email" /></label>
        <label><span>Screenshot (optional)</span><input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            setError("Choose a PNG, JPG, or WebP image under 5 MB."); event.target.value = ""; setScreenshot(undefined); return;
          }
          setError(""); setScreenshot(file);
        }} /></label>
        {screenshot && <button className="button button-secondary" type="button" onClick={() => { setScreenshot(undefined); const input = form.current?.elements.namedItem("screenshot") as HTMLInputElement; if (input) input.value = ""; }}>Remove screenshot</button>}
        <p id={noticeId}>Sending shares your message, attached screenshot, and up to the last minute of activity in Pointed with its maintainer through Sentry. The replay can include visible tickets. Typed input is masked. <Link href="/privacy" target="_blank">Privacy</Link></p>
        {error && <p role="alert">{error} <Link href="/support" target="_blank">Help</Link></p>}
        <div className="feedback-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? "Sending…" : "Send feedback"}</button></div>
      </form>
    </dialog>
  </span>;
}
