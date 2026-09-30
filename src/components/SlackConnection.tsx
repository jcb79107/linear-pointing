"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-request";
import type { SlackDestination } from "@/lib/slack";
import { SLACK_WEBHOOK_AGENT_INSTRUCTIONS } from "@/lib/slack-setup";

export function SlackConnection({ notice }: { notice?: string }) {
  const [destination, setDestination] = useState<SlackDestination | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [channelName, setChannelName] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    requestJson<{ destination: SlackDestination | null; oauthAvailable: boolean; error?: string }>("/api/slack/connection")
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok) throw new Error("Could not load Slack settings. Try again.");
        setDestination(data.destination); setOauthAvailable(data.oauthAvailable); setLoaded(true); setError(null);
      }).catch(() => { if (!cancelled) setError("Could not load Slack settings. Try again."); });
    return () => { cancelled = true; };
  }, [reload]);

  async function update(method: "PUT" | "DELETE") {
    setBusy(true); setError(null); setStatus(null);
    try {
      const { response, data } = await requestJson<{ destination?: SlackDestination; error?: string }>("/api/slack/connection", {
        method, headers: { "Content-Type": "application/json" },
        ...(method === "PUT" ? { body: JSON.stringify({ webhookUrl: webhookUrl.trim(), workspaceName, channelName }) } : {}),
      });
      if (!response.ok) throw new Error(response.status === 400 ? "Enter a valid Slack webhook URL and both destination names." : "Could not save Slack settings. Try again.");
      setDestination(data.destination ?? null); setWebhookUrl("");
      setStatus(method === "DELETE" ? "Disconnected from Pointed. Revoke the webhook in Slack if you also want to invalidate it." : "Channel saved. No message was sent.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update Slack."); }
    finally { setBusy(false); }
  }

  return <section className="settings-card" id="slack">
    <div className="settings-card-heading"><div><h2>Slack</h2><p>Choose where you send session invitations. This connection is private to your current Linear account and workspace.</p></div></div>
    {notice && !status && <p role="status">{notice}</p>}
    {error && <div className="form-error" role="alert">{error} {!loaded && <button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>}</div>}
    {status && <p role="status">{status}</p>}
    {!loaded && !error && <p role="status">Loading Slack connection…</p>}
    {loaded && <>
      <p>{destination ? <>Connected to <strong>{destination.workspaceName} · {destination.channelName}</strong>{destination.source === "manual" && " (names supplied during webhook setup)"}.</> : "No Slack channel connected. Copying invite links still works."}</p>
      <div className="slack-settings-actions">
        {oauthAvailable ? <a className="button button-primary" href="/api/auth/slack/start">{destination ? "Change Slack channel" : "Connect Slack"}</a> : <p>Slack sign-in is not enabled on this deployment yet. You can connect an incoming webhook below.</p>}
        {destination && <button className="button button-ghost" type="button" disabled={busy} onClick={() => void update("DELETE")}>Disconnect</button>}
      </div>
      {oauthAvailable && <p className="settings-help">Slack will ask you to choose a workspace and channel. Your workspace may require administrator approval. Connecting does not send a message.</p>}
      <details className="slack-manual-setup"><summary>Use an incoming webhook</summary>
        <p>Use this if Slack sign-in is unavailable. Create a webhook for your chosen channel in Slack, then save it here. Replacing the connection affects only your future sends.</p>
        <form noValidate onSubmit={(event) => { event.preventDefault(); void update("PUT"); }}>
          <label className="settings-field">Slack workspace<input required maxLength={80} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Your workspace name" /></label>
          <label className="settings-field">Slack channel<input required maxLength={80} value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="#refinement" /></label>
          <label className="settings-field">Incoming webhook URL<input required type="password" autoComplete="off" maxLength={500} value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://hooks.slack.com/services/…" /></label>
          <small>Stored encrypted. Channel names are labels; the webhook determines the actual destination. Confirm they match in Slack.</small>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save webhook"}</button>
        </form>
        <details><summary>Instructions for your AI assistant</summary><p>Select and copy these instructions. Never paste your webhook secret into a chat.</p><textarea className="resize-none" aria-label="Slack setup instructions for an AI assistant" readOnly rows={12} value={SLACK_WEBHOOK_AGENT_INSTRUCTIONS} /></details>
      </details>
    </>}
  </section>;
}
