"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { getFeedback } from "@sentry/nextjs";

export function FeedbackButton({ compact = false }: { compact?: boolean }) {
  const form = useRef<Awaited<ReturnType<NonNullable<ReturnType<typeof getFeedback>>["createForm"]>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => { form.current?.removeFromDom(); }, []);

  async function openFeedback() {
    setLoading(true);
    setFailed(false);
    try {
      const feedback = getFeedback();
      if (!feedback || !process.env.NEXT_PUBLIC_SENTRY_DSN) throw new Error("Feedback unavailable");
      if (!form.current) {
        form.current = await feedback.createForm();
        form.current.appendToDom();
      }
      form.current.open();
    } catch { setFailed(true); }
    finally { setLoading(false); }
  }

  return <span className="feedback-control">
    <button type="button" className={compact ? "header-icon-link" : "button button-secondary"} aria-label="Send feedback" title="Send feedback" disabled={loading} onClick={openFeedback}>
      <MessageSquare size={16} aria-hidden="true" />{!compact && (loading ? "Opening…" : "Send feedback")}
    </button>
    {failed && <span className="feedback-fallback" role="alert">Feedback couldn’t open. <Link href="/support">Get help</Link></span>}
  </span>;
}
