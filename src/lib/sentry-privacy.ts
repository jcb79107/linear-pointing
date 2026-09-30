import type { Event, ErrorEvent, EventHint, init } from "@sentry/nextjs";

export const privateDataCollection: NonNullable<Parameters<typeof init>[0]["dataCollection"]> = {
  userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
  urlQueryParams: false, graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false }, databaseQueryData: false,
  queues: false, stackFrameVariables: false, frameContextLines: 0,
};

const errorTypes = new Set(["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError", "AggregateError"]);

/** Only route categories are useful here; room codes, query strings and IDs aren't. */
export function telemetryPage(value: string): string {
  try {
    const path = new URL(value, "https://pointed.invalid").pathname;
    if (path.startsWith("/s/")) return "/s/[code]";
    if (path.startsWith("/app/sessions/")) return path.endsWith("/prepare") ? "/app/sessions/[id]/prepare" : "/app/sessions/[id]";
    if (["/", "/demo", "/privacy", "/support", "/app", "/app/settings", "/app/account"].includes(path)) return path;
    return path.startsWith("/api/") ? "/api/[route]" : "/[page]";
  } catch { return "/[page]"; }
}

function sourceFile(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Retain generated code locations for source maps, never page URLs or local home paths.
  const file = value.split(/[?#]/, 1)[0];
  if (!/\.(?:[cm]?js|tsx?)$/.test(file)) return undefined;
  const buildPath = file.match(/(?:\/_next\/static\/|\/\.next\/|app:\/\/\/)(.*)$/);
  if (buildPath) return `app:///${buildPath[1]}`;
  if (file.startsWith("node:")) return file;
  return undefined;
}

/** Rebuild events from an allowlist; provider messages can contain SQL or issue content. */
export function sanitizeSentryEvent(event: ErrorEvent, hint?: EventHint): ErrorEvent | null;
export function sanitizeSentryEvent(event: Event, hint?: EventHint): Event | null;
export function sanitizeSentryEvent(event: Event, hint?: EventHint): Event | null {
  if (hint) hint.attachments = [];
  if (event.type && event.type !== "feedback") return null;
  const clean: Event = {
    event_id: event.event_id,
    timestamp: event.timestamp,
    platform: event.platform,
    level: event.level,
    release: event.release,
    environment: event.environment,
    type: event.type,
    // Explicit null prevents Sentry ingestion from inferring location from the sender IP.
    user: { ip_address: null },
  };
  if (event.type === "feedback") {
    const feedback = event.contexts?.feedback;
    if (!feedback || typeof feedback.message !== "string") return null;
    // These are the only user-entered fields intentionally sent to Sentry.
    clean.contexts = { feedback: {
      message: feedback.message.slice(0, 5000),
      ...(typeof feedback.contact_email === "string" ? { contact_email: feedback.contact_email.slice(0, 254) } : {}),
      source: "pointed",
    } };
  } else {
    clean.exception = { values: event.exception?.values?.map((exception) => ({
      type: errorTypes.has(exception.type ?? "") ? exception.type : "Error",
      value: "Application error (details withheld)",
      stacktrace: { frames: exception.stacktrace?.frames?.map((frame) => ({
        filename: sourceFile(frame.filename),
        lineno: frame.lineno,
        colno: frame.colno,
        in_app: frame.in_app,
        // Function identifiers and source text are resolved from uploaded source maps.
      })) },
      mechanism: exception.mechanism ? { type: "generic", handled: exception.mechanism.handled } : undefined,
    })) };
    if (!clean.exception.values?.length) clean.message = "Application error (details withheld)";
    if (event.debug_meta?.images) clean.debug_meta = { images: event.debug_meta.images.filter((image) => image.type === "sourcemap").map((image) => ({
      type: image.type,
      debug_id: image.debug_id,
      code_file: sourceFile(image.code_file) ?? "app:///unknown.js",
    })) };
  }
  const reference = event.tags?.reference;
  clean.tags = {
    page: telemetryPage(typeof event.tags?.page === "string" ? event.tags.page : event.request?.url ?? "/[page]"),
    ...(typeof reference === "string" && /^[a-f0-9-]{36}$/.test(reference) ? { reference } : {}),
  };
  return clean;
}
