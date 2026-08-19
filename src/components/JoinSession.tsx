"use client";

import { ArrowRight, LoaderCircle, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestJson } from "@/lib/client-request";

export function JoinSession({
  code,
  session,
}: {
  code: string;
  session: { title: string; teamName: string; issueCount: number };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function join() {
      try {
        const { data, response } = await requestJson<{
          error?: string;
          sessionId?: string;
        }>(`/api/s/${code}/join`, { method: "POST" });
        if (cancelled) return;
        if (!response.ok || !data.sessionId) {
          setError(data.error ?? "Could not join this session");
          return;
        }
        router.replace(`/sessions/${data.sessionId}`);
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not join this session",
        );
      }
    }
    void join();
    return () => {
      cancelled = true;
    };
  }, [attempt, code, router]);

  return (
    <main className="auth-shell">
      <section className="join-card">
        {error ? (
          <>
            <span className="join-icon error">!</span>
            <h1>Couldn’t join {session.title}.</h1>
            <p>{error}</p>
            <button
              className="button button-primary"
              onClick={() => {
                setError(null);
                setAttempt((current) => current + 1);
              }}
              type="button"
            >
              <RotateCcw size={16} /> Try again
            </button>
            <a className="button button-dark" href="/app">
              Back to sessions <ArrowRight size={16} />
            </a>
          </>
        ) : (
          <>
            <span className="join-icon">
              <LoaderCircle className="spin" size={25} />
            </span>
            <h1>Joining {session.title}…</h1>
            <p>
              Checking access to {session.teamName} and loading {session.issueCount}{" "}
              {session.issueCount === 1 ? "ticket" : "tickets"}.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
