import { NextResponse } from "next/server";

import { destroyUserSession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroyUserSession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
