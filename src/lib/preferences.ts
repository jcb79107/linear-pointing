import { z } from "zod";

import type { UserSettings } from "@/lib/domain";

const pointValuesSchema = z
  .array(z.number().int().min(0).max(100))
  .min(2)
  .max(15)
  .refine((values) => new Set(values).size === values.length, {
    message: "Point values must be unique",
  })
  .refine(
    (values) => values.every((value, index) => index === 0 || value > values[index - 1]),
    { message: "Point values must be in ascending order" },
  );

export const userSettingsSchema = z.object({
  pointingPreset: z.enum([
    "linear-team",
    "linear",
    "fibonacci",
    "powers-of-two",
    "custom",
  ]),
  customPointValues: pointValuesSchema,
  autoReveal: z.boolean(),
  cycleScope: z.enum(["upcoming", "active", "any"]),
  stateTypes: z
    .array(z.enum(["backlog", "unstarted", "started"]))
    .min(1)
    .max(3),
  estimateScope: z.enum(["unestimated", "estimated", "any"]),
  assigneeScope: z.enum(["anyone", "me", "unassigned"]),
  defaultSort: z.enum([
    "linear",
    "priority",
    "oldest",
    "newest",
    "updated",
    "identifier",
    "title",
    "custom",
  ]),
  customSortRules: z
    .array(
      z.object({
        field: z.enum([
          "priority",
          "createdAt",
          "updatedAt",
          "identifier",
          "title",
          "estimate",
        ]),
        direction: z.enum(["asc", "desc"]),
      }),
    )
    .min(1)
    .max(3),
});

export const DEFAULT_USER_SETTINGS: UserSettings = {
  pointingPreset: "linear-team",
  customPointValues: [0, 1, 2, 3, 5, 8, 13],
  autoReveal: true,
  cycleScope: "any",
  stateTypes: ["unstarted"],
  estimateScope: "unestimated",
  assigneeScope: "anyone",
  defaultSort: "linear",
  customSortRules: [
    { field: "priority", direction: "asc" },
    { field: "createdAt", direction: "asc" },
  ],
};

export function parseUserSettings(value: unknown): UserSettings {
  const parsed = userSettingsSchema.safeParse(value);
  if (!parsed.success) return DEFAULT_USER_SETTINGS;
  // Preserve old stored rows without exposing obsolete deck/custom-sort controls.
  return { ...parsed.data, pointingPreset: "linear-team", defaultSort: parsed.data.defaultSort === "custom" ? "linear" : parsed.data.defaultSort };
}
