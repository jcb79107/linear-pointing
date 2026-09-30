"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { requestJson } from "@/lib/client-request";

export function AccountDeletion({ onDeleted }: { onDeleted?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError(null);
    try {
      const { response, data } = await requestJson<{error?: string}>("/api/account", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "delete-my-account" }),
      });
      if (!response.ok) throw new Error(data.error ?? "Could not delete your account. Try again.");
      onDeleted?.();
      router.replace("/support?deleted=true");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete your account.");
      inFlight.current = false; setBusy(false);
    }
  }
  return <section className="settings-card" id="account">
    <div className="settings-card-heading"><div><h2>Your account data</h2><p>Remove your Pointed account and stored connections for this Linear workspace.</p></div></div>
    <p className="cycle-policy">This also permanently deletes every session you created, including the team’s session history. Sessions owned by other people remain. Estimates already saved to Linear stay in Linear.</p>
    <button className="button button-ghost" type="button" onClick={() => setOpen(true)}>Delete my account</button>
    <ConfirmDialog open={open} busy={busy} error={error} title="Permanently delete your account?" description="Your profile, stored connections, votes, and every session you created will be deleted. Other participants will lose access to those sessions. This cannot be undone in Pointed." detail="Linear issues and estimates are not deleted. To revoke the provider authorization too, remove Pointed from your Linear integrations." confirmLabel="Delete my account" onCancel={() => {setOpen(false); setError(null);}} onConfirm={() => void remove()} />
  </section>;
}
