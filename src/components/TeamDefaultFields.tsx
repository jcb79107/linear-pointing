"use client";
import type { TeamDefaults } from "@/lib/domain";
import { cycleChoices, cycleOffsetFromValue } from "@/lib/team-defaults";
export function TeamDefaultFields({
  value,
  onChange,
  disabled = false,
}: {
  value: TeamDefaults;
  onChange: (value: TeamDefaults) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="team-default-fields" disabled={disabled}>
      <legend className="sr-only">Session defaults</legend>
      <label>
        Default cycle
        <select
          aria-label="Default cycle"
          value={String(value.cycleOffset)}
          onChange={(e) =>
            onChange({
              ...value,
              cycleOffset: cycleOffsetFromValue(e.target.value),
            })
          }
        >
          {cycleChoices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Starting ticket order
        <select
          aria-label="Starting ticket order"
          value={value.defaultSort}
          onChange={(e) =>
            onChange({
              ...value,
              defaultSort: e.target.value as TeamDefaults["defaultSort"],
            })
          }
        >
          <option value="linear">Linear manual order</option>
          <option value="priority">Priority</option>
          <option value="oldest">Oldest first</option>
        </select>
      </label>
      <label>
        Reveal votes
        <select
          aria-label="Reveal votes"
          value={value.autoReveal ? "auto" : "manual"}
          onChange={(e) =>
            onChange({ ...value, autoReveal: e.target.value === "auto" })
          }
        >
          <option value="auto">When everyone has voted</option>
          <option value="manual">Facilitator reveals</option>
        </select>
      </label>
      <label>
        Facilitator votes
        <select
          aria-label="Facilitator votes"
          value={value.facilitatorVotes ? "yes" : "no"}
          onChange={(e) =>
            onChange({ ...value, facilitatorVotes: e.target.value === "yes" })
          }
        >
          <option value="no">Off — facilitate only</option>
          <option value="yes">On — vote with the team</option>
        </select>
      </label>
    </fieldset>
  );
}
