import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
export const metadata: Metadata = { title: "Help", description: "Get started with Pointed and resolve common session problems." };
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return <main className="information-page"><Brand /><article>
    {deleted === "true" && <p role="status">Your Pointed account has been deleted. Linear issues and estimates are unchanged.</p>}
    <h1>Help with Pointed</h1><p>Pointed is in public beta. Start with a small session and keep your usual workflow available while your team tries it.</p>
    <h2>Run your first session</h2><ol><li>Put unestimated issues into a Linear cycle. Enable estimates for the team.</li><li>Connect Linear, choose the team, and create a session.</li><li>Load the current, next, or a later cycle. Teams without cycles can choose issues with no cycle.</li><li>Review the agenda, reorder or remove tickets, then share the invite link.</li><li>Teammates sign in, read independently, and vote. Discuss the revealed votes; the facilitator chooses and saves the estimate.</li></ol>
    <h2>Tickets are missing</h2><p>Check the selected team and cycle. Estimated, completed, and canceled issues are excluded; zero is an estimate. A draft stays tied to the cycle you first loaded. Reordering the preview does not reorder Linear.</p>
    <h2>A teammate cannot join</h2><p>They need access to the same Linear workspace and team. Check which workspace they authorized, then reopen the invitation. Do not share credentials or session cookies.</p>
    <h2>Saving or connecting failed</h2><p>Keep the room open, check your connection, and retry after reading the error. Enable estimate saving in Settings if your connection is read-only. If an estimate changed in Linear, review the conflict before choosing whether to overwrite it. Refreshing the room recovers server-saved session state.</p>
    <h2>Disconnect or delete data</h2><p>Manage Slack and delete your Pointed account in <Link href="/app/account">Settings</Link>. Revoke Pointed in Linear’s integrations to remove provider authorization. Read the <Link href="/privacy">data and retention details</Link> before deleting a session or account.</p>
    <h2>Report a problem</h2><p><a href="https://github.com/jcb79107/linear-pointing/issues/new/choose">Open a GitHub issue</a> with the steps, browser, expected result, and any error reference. This is public: remove private ticket content and credentials. Use <a href="https://github.com/jcb79107/linear-pointing/security/advisories/new">private reporting</a> for security or privacy vulnerabilities. Support is handled by the maintainer; there is no guaranteed response time.</p>
    <Link href="/">Back to Pointed</Link>
  </article></main>;
}
