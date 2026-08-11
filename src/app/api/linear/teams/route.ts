import { requireCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { listLinearTeams } from "@/lib/linear";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return Response.json({ teams: await listLinearTeams(user.id) });
  } catch (error) {
    return apiError(error);
  }
}
