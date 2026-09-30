import { z } from "zod";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { deleteAccount } from "@/lib/account";
import { apiError, assertSameOrigin } from "@/lib/http";

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireCurrentUser();
    z.object({ confirmation: z.literal("delete-my-account") }).strict().parse(await request.json());
    await deleteAccount(user.id);
    const response = new NextResponse(null, { status: 204 });
    response.cookies.set("lpp_session", "", { maxAge: 0, path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    return response;
  } catch (error) { return apiError(error); }
}
