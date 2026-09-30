"use client";
import { useEffect } from "react";
import { captureException } from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureException(error); }, [error]);
  return <html lang="en"><body><main><h1>Something didn’t load</h1><p>Try again, or contact the maintainer if the problem continues.</p><button type="button" onClick={reset}>Try again</button><p><a href="/support">Get help</a></p></main></body></html>;
}
