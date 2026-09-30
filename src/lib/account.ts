import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pokerSessions, users } from "@/db/schema";

// Only the authenticated identity is accepted by the route. Cascades remove
// credentials, auth sessions, votes, memberships, and personal settings.
export async function deleteAccount(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(pokerSessions).where(eq(pokerSessions.hostUserId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
}
