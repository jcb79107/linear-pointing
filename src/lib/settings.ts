import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userSettings } from "@/db/schema";
import type { UserSettings } from "@/lib/domain";
import {
  DEFAULT_USER_SETTINGS,
  parseUserSettings,
  userSettingsSchema,
} from "@/lib/preferences";

function settingsFromRow(
  row: typeof userSettings.$inferSelect | undefined,
): UserSettings {
  if (!row) return DEFAULT_USER_SETTINGS;
  return parseUserSettings({
    pointingPreset: row.pointingPreset,
    customPointValues: row.customPointValues,
    autoReveal: row.autoReveal,
    cycleScope: row.cycleScope,
    stateTypes: row.stateTypes,
    estimateScope: row.estimateScope,
    assigneeScope: row.assigneeScope,
    defaultSort: row.defaultSort,
    customSortRules: row.customSortRules,
  });
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return settingsFromRow(row);
}

export async function saveUserSettings(
  userId: string,
  input: UserSettings,
): Promise<UserSettings> {
  const value = parseUserSettings(userSettingsSchema.parse(input));
  const persisted = {
    pointingPreset: value.pointingPreset,
    customPointValues: value.customPointValues,
    autoReveal: value.autoReveal,
    cycleScope: value.cycleScope,
    stateTypes: value.stateTypes,
    estimateScope: value.estimateScope,
    assigneeScope: value.assigneeScope,
    defaultSort: value.defaultSort,
    customSortRules: value.customSortRules,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(userSettings)
    .values({ userId, ...persisted })
    .onConflictDoUpdate({ target: userSettings.userId, set: persisted })
    .returning();
  return settingsFromRow(row);
}
