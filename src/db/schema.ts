import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "live",
  "ended",
]);
export const queueStatusEnum = pgEnum("queue_item_status", [
  "pending",
  "active",
  "estimated",
  "skipped",
]);
export const participantRoleEnum = pgEnum("participant_role", [
  "facilitator",
  "voter",
  "observer",
]);
export const roundStatusEnum = pgEnum("round_status", [
  "voting",
  "revealed",
  "finalized",
  "abandoned",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    linearUserId: text("linear_user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_org_linear_user_idx").on(
      table.organizationId,
      table.linearUserId,
    ),
  ],
);

export const linearConnections = pgTable("linear_connections", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  scopes: text("scopes").array().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pointingPreset: text("pointing_preset").default("linear-team").notNull(),
  customPointValues: jsonb("custom_point_values")
    .$type<number[]>()
    .default([])
    .notNull(),
  autoReveal: boolean("auto_reveal").default(true).notNull(),
  cycleScope: text("cycle_scope").default("upcoming").notNull(),
  stateTypes: jsonb("state_types")
    .$type<string[]>()
    .default(["unstarted"])
    .notNull(),
  estimateScope: text("estimate_scope").default("unestimated").notNull(),
  assigneeScope: text("assignee_scope").default("anyone").notNull(),
  defaultSort: text("default_sort").default("linear").notNull(),
  customSortRules: jsonb("custom_sort_rules")
    .$type<Array<{ field: string; direction: string }>>()
    .default([
      { field: "priority", direction: "asc" },
      { field: "createdAt", direction: "asc" },
    ])
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("auth_sessions_token_hash_idx").on(table.tokenHash)],
);

export const pokerSessions = pgTable(
  "poker_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 12 }).notNull(),
    organizationId: text("organization_id").notNull(),
    teamId: text("team_id").notNull(),
    teamName: text("team_name").notNull(),
    title: text("title").notNull(),
    status: sessionStatusEnum("status").default("draft").notNull(),
    hostUserId: uuid("host_user_id")
      .notNull()
      .references(() => users.id),
    activeQueueItemId: uuid("active_queue_item_id"),
    scaleType: text("scale_type").notNull(),
    scaleAllowZero: boolean("scale_allow_zero").default(false).notNull(),
    scaleExtended: boolean("scale_extended").default(false).notNull(),
    pointingCards: jsonb("pointing_cards")
      .$type<Array<{ value: number; label: string }>>()
      .default([
        { value: 0, label: "0" },
        { value: 1, label: "1" },
        { value: 2, label: "2" },
        { value: 3, label: "3" },
        { value: 4, label: "4" },
      ])
      .notNull(),
    autoReveal: boolean("auto_reveal").default(true).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("poker_sessions_code_idx").on(table.code),
    index("poker_sessions_org_idx").on(table.organizationId),
  ],
);

export const queueItems = pgTable(
  "queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => pokerSessions.id, { onDelete: "cascade" }),
    linearIssueId: text("linear_issue_id").notNull(),
    identifier: text("identifier").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    priorityLabel: text("priority_label"),
    priority: integer("priority").default(0).notNull(),
    linearSortOrder: doublePrecision("linear_sort_order").default(0).notNull(),
    stateName: text("state_name"),
    assigneeName: text("assignee_name"),
    projectName: text("project_name"),
    labels: jsonb("labels").$type<string[]>().default([]).notNull(),
    subIssues: jsonb("sub_issues")
      .$type<
        Array<{
          id: string;
          identifier: string;
          title: string;
          stateName: string | null;
        }>
      >()
      .default([])
      .notNull(),
    attachments: jsonb("attachments")
      .$type<
        Array<{
          id: string;
          title: string;
          subtitle: string | null;
          url: string;
          sourceType: string | null;
        }>
      >()
      .default([])
      .notNull(),
    position: integer("position").notNull(),
    status: queueStatusEnum("status").default("pending").notNull(),
    currentEstimate: integer("current_estimate"),
    finalEstimate: integer("final_estimate"),
    groomingOutcome: text("grooming_outcome"),
    groomingNote: text("grooming_note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    linearCreatedAt: timestamp("linear_created_at", { withTimezone: true }),
    linearUpdatedAt: timestamp("linear_updated_at", { withTimezone: true }),
    dueDate: text("due_date"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("queue_session_linear_issue_idx").on(
      table.sessionId,
      table.linearIssueId,
    ),
    uniqueIndex("queue_session_position_idx").on(
      table.sessionId,
      table.position,
    ),
  ],
);

export const participants = pgTable(
  "participants",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => pokerSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: participantRoleEnum("role").default("voter").notNull(),
    votingEnabled: boolean("voting_enabled").default(true).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.userId] })],
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => pokerSessions.id, { onDelete: "cascade" }),
    queueItemId: uuid("queue_item_id")
      .notNull()
      .references(() => queueItems.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    status: roundStatusEnum("status").default("voting").notNull(),
    estimateAtStart: integer("estimate_at_start"),
    scaleValues: jsonb("scale_values").$type<number[]>().notNull(),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("round_queue_number_idx").on(table.queueItemId, table.number),
    index("round_session_idx").on(table.sessionId),
  ],
);

export const roundVoters = pgTable(
  "round_voters",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roundId, table.userId] })],
);

export const votes = pgTable(
  "votes",
  {
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.roundId, table.userId] })],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => pokerSessions.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("audit_session_idx").on(table.sessionId)],
);
