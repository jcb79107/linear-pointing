import { requireCurrentUser } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";
import { userSettingsSchema } from "@/lib/preferences";
import { getUserSettings, saveUserSettings } from "@/lib/settings";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return Response.json({ settings: await getUserSettings(user.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    const input = userSettingsSchema.parse(await request.json());
    return Response.json({ settings: await saveUserSettings(user.id, input) });
  } catch (error) {
    return apiError(error);
  }
}
