"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { requestJson } from "@/lib/client-request";
import { requestSlackInvite } from "@/lib/slack-invite-request";
import type { SlackDestination } from "@/lib/slack";

export function SlackInviteButton({ sessionId, title, teamName, issueCount, code }: {
  sessionId: string; title: string; teamName: string; issueCount: number; code: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [destination, setDestination] = useState<SlackDestination | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsConnection, setNeedsConnection] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function preview() {
    setBusy(true); setError(null); setMessage(null); setNeedsConnection(false);
    try {
      const { response, data } = await requestJson<{ destination: SlackDestination | null }>("/api/slack/connection");
      if (!response.ok) throw new Error("Could not load your Slack channel. Try again or copy the invite.");
      setDestination(data.destination);
      if (data.destination) setOpen(true); else setNeedsConnection(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load Slack."); }
    finally { setBusy(false); }
  }
  async function send() {
    if (!destination) return;
    setBusy(true); setError(null);
    try {
      await requestSlackInvite(sessionId, destination.connectionId);
      setOpen(false); setMessage(`Invite sent to ${destination.workspaceName} · ${destination.channelName}.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Check Slack before trying again."); }
    finally { setBusy(false); }
  }
  return <div className="slack-invite-control">
    <button ref={triggerRef} className="button button-ghost" aria-label="Send to Slack" title="Send to Slack" type="button" disabled={busy} onClick={() => void preview()}><Send size={15} />{busy ? "Working…" : "Send to Slack"}</button>
    {needsConnection && <span role="status"><Link href="/app/settings#slack">Connect a Slack channel in Settings</Link>, or use Copy invite.</span>}
    {message && <span role="status">{message}</span>}
    {error && !open && <span role="alert">{error}</span>}
    <ConfirmDialog returnFocusRef={triggerRef} error={error} variant="primary" open={open} busy={busy} title="Send session invite?"
      description={`Post to ${destination?.workspaceName} · ${destination?.channelName}${destination?.source === "manual" ? " (webhook destination; names supplied by you)" : ""}.`}
      detail={`Pointing session: ${title}\n${issueCount} issues · ${teamName}\nJoin link: /s/${code}`}
      confirmLabel="Send invite" onCancel={() => { setOpen(false); setError(null); }} onConfirm={() => void send()} />
  </div>;
}
