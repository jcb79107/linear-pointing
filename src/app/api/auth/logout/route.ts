import { NextResponse } from "next/server";

import { destroyUserSession } from "@/lib/auth";
import { apiError, assertSameOrigin } from "@/lib/http";

export async function POST(request: Request) {
  try {
  assertSameOrigin(request);
  await destroyUserSession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  } catch (error) { return apiError(error); }
}
