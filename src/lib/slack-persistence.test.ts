import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const state = vi.hoisted(() => ({ db: undefined as PgliteDatabase<typeof schema> | undefined }));
vi.mock("server-only", () => ({}));
// Replace only the database transport. Production queries and encryption run unchanged.
vi.mock("@/db", () => ({ get db() { return state.db; } }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => ({ TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") }) }));
import { decryptSecret } from "./crypto";
import { deliverSlackInvite, disconnectSlack, getSlackDestination, saveSlackConnection } from "./slack-connections";

let directory: string;
let client: PGlite;
const fetchMock = vi.fn();
const legacyUser = randomUUID();
const legacySession = randomUUID();
const originalCards = [{ value: 1, label: "Small" }, { value: 8, label: "Large" }];
const connection = { webhookUrl: "https://hooks.slack.com/services/TTEST/BTEST/fixtureonly", workspaceName: "Fixture workspace", channelName: "#fixture", source: "manual" as const };
const invite = { title: "Disposable test", teamName: "Fixture team", issueCount: 1, inviteUrl: "https://pointed.test/s/FIXTURE" };
const database = () => state.db!;

async function addUser(organizationId: string = randomUUID(), linearUserId: string = randomUUID()) {
  const [user] = await database().insert(schema.users).values({ organizationId, linearUserId, displayName: "Test fixture" }).returning();
  return user.id;
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "pointed-db-test-"));
  client = new PGlite(path.join(directory, "data"));
  state.db = drizzle(client, { schema });
  const baseline = path.join(directory, "baseline");
  await mkdir(path.join(baseline, "meta"), { recursive: true });
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  const entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 6);
  await writeFile(path.join(baseline, "meta/_journal.json"), JSON.stringify({ ...journal, entries }));
  for (const entry of entries) await copyFile(`drizzle/${entry.tag}.sql`, path.join(baseline, `${entry.tag}.sql`));
  await migrate(database(), { migrationsFolder: baseline });
  await database().insert(schema.users).values({ id: legacyUser, organizationId: "legacy-org", linearUserId: "legacy-user", displayName: "Legacy fixture" });
  // Raw insert uses the old SQL default, rather than the new TypeScript default.
  await database().execute(sql`insert into user_settings (user_id, pointing_preset, custom_point_values, default_sort) values (${legacyUser}, 'custom', '[1,8]', 'custom')`);
  await database().execute(sql`insert into poker_sessions (id, code, organization_id, team_id, team_name, title, host_user_id, scale_type, pointing_cards) values (${legacySession}, 'LEGACY', 'legacy-org', 'legacy-team', 'Legacy', 'Existing room', ${legacyUser}, 'fibonacci', ${JSON.stringify(originalCards)}::jsonb)`);
  await migrate(database(), { migrationsFolder: "drizzle" });
}, 30_000);

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response("ok"));
  vi.stubGlobal("fetch", fetchMock);
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await client?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("disposable PostgreSQL migration and Slack persistence", () => {
  it("upgrades all migrations, preserves existing settings/decks, and does not replay applied migrations", async () => {
    await migrate(database(), { migrationsFolder: "drizzle" });
    const journal = await client.query<{ count: number }>('select count(*)::int as count from drizzle.__drizzle_migrations');
    expect(journal.rows[0].count).toBe(8);
    const [settings] = await database().select().from(schema.userSettings).where(eq(schema.userSettings.userId, legacyUser));
    expect(settings).toMatchObject({ cycleScope: "upcoming", pointingPreset: "custom", customPointValues: [1, 8], defaultSort: "custom" });
    const [session] = await database().select().from(schema.pokerSessions).where(eq(schema.pokerSessions.id, legacySession));
    expect(session.pointingCards).toEqual(originalCards);
    const userId = await addUser();
    await database().execute(sql`insert into user_settings (user_id) values (${userId})`);
    const [newSettings] = await database().select().from(schema.userSettings).where(eq(schema.userSettings.userId, userId));
    expect(newSettings.cycleScope).toBe("any");
  });

  it("persists encrypted URLs across reopening, scopes metadata, and isolates users/workspaces", async () => {
    const userId = await addUser("workspace-a", "same-linear-user");
    const otherWorkspace = await addUser("workspace-b", "same-linear-user");
    const otherUser = await addUser("workspace-a", "other-linear-user");
    await saveSlackConnection(userId, connection);
    await saveSlackConnection(otherWorkspace, { ...connection, channelName: "#other-workspace" });
    await saveSlackConnection(otherUser, { ...connection, channelName: "#other-user" });
    await client.close();
    client = new PGlite(path.join(directory, "data"));
    state.db = drizzle(client, { schema });
    const destination = await getSlackDestination(userId);
    expect(destination).toMatchObject({ workspaceName: connection.workspaceName, channelName: "#fixture", source: "manual" });
    expect(Object.keys(destination!).sort()).toEqual(["channelName", "connectionId", "source", "workspaceName"]);
    const [stored] = await database().select().from(schema.slackConnections).where(eq(schema.slackConnections.userId, userId));
    expect(stored.encryptedWebhookUrl).not.toContain("hooks.slack.com");
    expect(decryptSecret(stored.encryptedWebhookUrl)).toBe(connection.webhookUrl);
    await disconnectSlack(userId);
    expect(await getSlackDestination(userId)).toBeNull();
    expect((await getSlackDestination(otherWorkspace))?.channelName).toBe("#other-workspace");
    expect((await getSlackDestination(otherUser))?.channelName).toBe("#other-user");
    expect(fetchMock).not.toHaveBeenCalled();
  }, 15_000);

  it("invalidates stale confirmations and prevents another owner from claiming a send", async () => {
    const userId = await addUser();
    const otherUser = await addUser();
    await saveSlackConnection(userId, connection);
    const old = (await getSlackDestination(userId))!;
    await saveSlackConnection(userId, { ...connection, source: "oauth", channelName: "#replacement" });
    const current = (await getSlackDestination(userId))!;
    expect(current.connectionId).not.toBe(old.connectionId);
    await expect(deliverSlackInvite(userId, old.connectionId, invite)).rejects.toThrow("destination changed");
    await expect(deliverSlackInvite(otherUser, current.connectionId, invite)).rejects.toThrow("destination changed");
    expect(fetchMock).not.toHaveBeenCalled();
    await deliverSlackInvite(userId, current.connectionId, invite);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("admits one competing send, retains cooldown on reconnect, and allows sends after expiry", async () => {
    const userId = await addUser();
    await saveSlackConnection(userId, connection);
    const destination = (await getSlackDestination(userId))!;
    const outcomes = await Promise.allSettled(Array.from({ length: 4 }, () => deliverSlackInvite(userId, destination.connectionId, invite)));
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await saveSlackConnection(userId, connection);
    const replacement = (await getSlackDestination(userId))!;
    await expect(deliverSlackInvite(userId, replacement.connectionId, invite)).rejects.toThrow("Wait 30 seconds");
    await database().update(schema.slackConnections).set({ lastSentAt: new Date(Date.now() - 31_000) }).where(eq(schema.slackConnections.userId, userId));
    await deliverSlackInvite(userId, replacement.connectionId, invite);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retains a failed delivery reservation without retrying the webhook", async () => {
    const userId = await addUser();
    await saveSlackConnection(userId, connection);
    const destination = (await getSlackDestination(userId))!;
    fetchMock.mockRejectedValue(new TypeError("Simulated network failure"));
    await expect(deliverSlackInvite(userId, destination.connectionId, invite)).rejects.toThrow("Check the channel");
    await expect(deliverSlackInvite(userId, destination.connectionId, invite)).rejects.toThrow("Wait 30 seconds");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enforces the owner foreign key and cascades deleted users", async () => {
    await expect(saveSlackConnection(randomUUID(), connection)).rejects.toThrow();
    const userId = await addUser();
    await saveSlackConnection(userId, connection);
    await database().delete(schema.users).where(eq(schema.users.id, userId));
    expect(await getSlackDestination(userId)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
