import { z } from "zod";
import type { TeamDefaults } from "@/lib/domain";

export const teamDefaultsSchema = z.object({
  cycleOffset: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal("backlog"),
  ]),
  defaultSort: z.enum(["linear", "priority", "oldest"]),
  autoReveal: z.boolean(),
  facilitatorVotes: z.boolean(),
});
export const DEFAULT_TEAM_DEFAULTS: TeamDefaults = {
  cycleOffset: 1,
  defaultSort: "linear",
  autoReveal: true,
  facilitatorVotes: false,
};
export const cycleChoices = [
  { value: "0", label: "Current cycle" },
  { value: "1", label: "Next cycle" },
  { value: "2", label: "2 cycles ahead" },
  { value: "3", label: "3 cycles ahead" },
  { value: "backlog", label: "Backlog / no cycle" },
];
export function cycleOffsetFromValue(
  value: string,
): TeamDefaults["cycleOffset"] {
  return teamDefaultsSchema.shape.cycleOffset.parse(
    value === "backlog" ? value : Number(value),
  );
}
