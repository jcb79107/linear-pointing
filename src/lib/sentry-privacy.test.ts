import { describe, expect, it } from "vitest";
import type { Event, EventHint } from "@sentry/nextjs";
import { privateDataCollection, sanitizeSentryEvent, telemetryPage } from "./sentry-privacy";

describe("Sentry privacy boundary", () => {
  it("retains code locations and references without request or provider data", () => {
    const event: Event = {
      event_id: "test-id", release: "pointed@abc123", environment: "production",
      request: { url: "https://pointed.test/s/private-room?token=secret", headers: { authorization: "Bearer secret" }, data: "private-ticket", cookies: { session: "secret" } },
      user: { id: "private-user", email: "private@example.com", ip_address: "1.2.3.4" },
      contexts: { arbitrary: { votes: [3, 5] } }, extra: { sql: "private-ticket" },
      breadcrumbs: [{ message: "private-ticket" }], message: "secret", transaction: "/s/private-room",
      tags: { reference: "12345678-1234-1234-1234-123456789abc", team: "private-team" },
      exception: { values: [{ type: "TypeError", value: "private-ticket secret", stacktrace: { frames: [{ filename: "https://pointed.test/_next/static/chunks/abc.js?token=secret", function: "private-ticket", lineno: 10, colno: 4, vars: { token: "secret" }, context_line: "private-ticket" }] } }] },
      debug_meta: { images: [{ type: "sourcemap", code_file: "https://pointed.test/_next/static/chunks/abc.js?token=secret", debug_id: "debug-id" }] },
    };
    const hint: EventHint = { attachments: [{ filename: "private.png", data: "private-ticket" }] };
    const clean = sanitizeSentryEvent(event, hint)!;
    expect(JSON.stringify(clean)).not.toMatch(/private|secret|1\.2\.3\.4/);
    expect(hint.attachments).toEqual([]);
    expect(clean.tags).toEqual({ page: "/s/[code]", reference: event.tags!.reference });
    expect(clean.exception?.values?.[0].stacktrace?.frames?.[0]).toMatchObject({ filename: "app:///chunks/abc.js", lineno: 10, colno: 4 });
    expect(clean.debug_meta?.images?.[0].code_file).toBe("app:///chunks/abc.js");
    expect(sanitizeSentryEvent(clean)).toEqual(clean);
  });
  it("sends only feedback deliberately entered, with no attached user or room context", () => {
    const clean = sanitizeSentryEvent({ type: "feedback", contexts: { feedback: { message: "The queue is confusing", contact_email: "reply@example.com", name: "Private account name", url: "https://pointed.test/s/secret", replay_id: "private" } }, user: { email: "account@example.com" }, tags: { page: "/demo?secret=1" } });
    expect(clean?.contexts).toEqual({ feedback: { message: "The queue is confusing", contact_email: "reply@example.com", source: "pointed" } });
    expect(clean?.tags).toEqual({ page: "/demo" });
    expect(clean?.user).toEqual({ ip_address: null });
  });
  it("supports anonymous feedback and drops all other telemetry categories", () => {
    expect(sanitizeSentryEvent({ type: "feedback", contexts: { feedback: { message: "Hello" } } })?.contexts?.feedback).not.toHaveProperty("contact_email");
    expect(sanitizeSentryEvent({ type: "transaction" })).toBeNull();
    expect(sanitizeSentryEvent({ type: "replay_event" })?.type).toBe("replay_event");
    expect(privateDataCollection).toMatchObject({ userInfo: false, httpBodies: [], cookies: false, stackFrameVariables: false });
  });
  it.each([["/s/secret", "/s/[code]"], ["/app/sessions/secret/prepare?token=secret", "/app/sessions/[id]/prepare"], ["/api/auth/linear/callback?code=secret", "/api/[route]"], ["/unknown/secret", "/[page]"]])("normalizes %s", (url, expected) => {
    expect(telemetryPage(url)).toBe(expected);
  });
});

it("filters real SDK error and feedback envelopes before transport", async () => {
  const Sentry = await import("@sentry/nextjs");
  const envelopes: unknown[] = [];
  Sentry.init({
    dsn: "https://public@example.com/1",
    defaultIntegrations: [],
    dataCollection: privateDataCollection,
    beforeSend: sanitizeSentryEvent,
    sendClientReports: false,
    transport: () => ({ send: async (envelope: unknown) => { envelopes.push(envelope); return { statusCode: 200 }; }, flush: async () => true }),
  });
  Sentry.addEventProcessor(sanitizeSentryEvent);
  Sentry.setUser({ email: "DO_NOT_SEND@example.com" });
  Sentry.setExtra("ticket", "DO_NOT_SEND");
  Sentry.captureException(new Error("DO_NOT_SEND"));
  Sentry.captureFeedback({ message: "Explicit feedback", url: "https://example.com/s/DO_NOT_SEND", email: "reply@example.com" }, { includeReplay: false });
  await Sentry.flush(2000);
  expect(envelopes).toHaveLength(2);
  expect(JSON.stringify(envelopes)).not.toContain("DO_NOT_SEND");
  expect(JSON.stringify(envelopes)).toContain("Explicit feedback");
  expect(JSON.stringify(envelopes)).toContain("reply@example.com");
  await Sentry.close();
});

it("preserves a submitted screenshot and valid replay link while dropping other attachments", () => {
  const hint: EventHint = { attachments: [
    { filename: "screenshot", contentType: "image/png", data: new Uint8Array([1, 2]) },
    { filename: "secret.txt", contentType: "text/plain", data: "credentials" },
  ] };
  const clean = sanitizeSentryEvent({ type: "feedback", contexts: { feedback: { message: "Button overlaps", replay_id: "a".repeat(32) } } }, hint);
  expect(clean?.contexts?.feedback?.replay_id).toBe("a".repeat(32));
  expect(hint.attachments).toHaveLength(1);
  expect(hint.attachments?.[0].contentType).toBe("image/png");
});
