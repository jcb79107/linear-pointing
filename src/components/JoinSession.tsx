"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function JoinSession({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function join() {
      const response = await fetch(`/api/s/${code}/join`, { method: "POST" });
      const data = await response.json();
      if (cancelled) return;
      if (!response.ok) {
        setError(data.error ?? "Could not join this session");
        return;
      }
      router.replace(`/sessions/${data.sessionId}`);
    }
    void join();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  return (
    <main className="auth-shell">
      <section className="join-card">
        {error ? (
          <>
            <span className="join-icon error">!</span>
            <h1>Couldn’t enter the room.</h1>
            <p>{error}</p>
            <a className="button button-dark" href="/app">
              Back to sessions <ArrowRight size={16} />
            </a>
          </>
        ) : (
          <>
            <span className="join-icon">
              <LoaderCircle className="spin" size={25} />
            </span>
            <h1>Joining the room…</h1>
            <p>Checking your Linear workspace and team access.</p>
          </>
        )}
      </section>
    </main>
  );
}
