import { sql } from "drizzle-orm";
import { db } from "@/db";
export const dynamic = "force-dynamic";
export const maxDuration = 10;
// No account or ticket data is read or exposed. The query also verifies the
// schema this release needs, unlike a process-only health response.
export async function GET() {
  try {
    await db.execute(sql`select 1 from team_defaults limit 0`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error(JSON.stringify({ event: "health_check_failed" }));
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
