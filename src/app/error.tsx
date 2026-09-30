"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="information-page"><article><h1>Something didn’t load</h1><p>Your saved sessions are still there. Check your connection and try again.</p><button className="button button-primary" type="button" onClick={reset}>Try again</button><p><Link href="/app">Back to sessions</Link> · <Link href="/support">Get help</Link></p></article></main>;
}
