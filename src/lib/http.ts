import { captureException } from "@sentry/nextjs";
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
  const reference = crypto.randomUUID();
  captureException(error, { tags: { reference } });
  // Provider errors may embed SQL, ticket content, or credentials. Log only a
  // correlation ID; never forward raw exception text to clients or shared logs.
  console.error(JSON.stringify({ event: "api_error", reference }));
  return Response.json(
    { error: `Something went wrong. Try again. Reference: ${reference}`, reference },
    { status: 500 },
  );
}

export function safeReturnTo(value: string | null): string {
  // Reject URL parser normalization that could turn a local path into another origin.
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /\s/.test(value)
  ) return "/app";
  return value;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) throw new Error("FORBIDDEN");
}
