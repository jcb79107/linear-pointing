import { ZodError } from "zod";

export function apiError(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "Invalid request", details: error.flatten() },
      { status: 400 },
    );
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }
  if (error instanceof Error && error.message.startsWith("CONFLICT:")) {
    return Response.json(
      { error: error.message.slice("CONFLICT:".length) },
      { status: 409 },
    );
  }
  if (error instanceof Error && error.message.startsWith("UNPROCESSABLE:")) {
    return Response.json(
      { error: error.message.slice("UNPROCESSABLE:".length) },
      { status: 422 },
    );
  }
  console.error(error);
  return Response.json(
    { error: error instanceof Error ? error.message : "Unexpected error" },
    { status: 500 },
  );
}

export function safeReturnTo(value: string | null): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) throw new Error("FORBIDDEN");
}
