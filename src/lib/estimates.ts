import type {
  EstimateCard,
  LinearTeamSummary,
  PointingPreset,
  UserSettings,
  VoteValue,
} from "@/lib/domain";

export const LEGACY_POINTING_CARDS: EstimateCard[] = [0, 1, 2, 3, 4].map(
  (value) => ({ value, label: `${value}` }),
);

const PRESET_VALUES: Record<Exclude<PointingPreset, "linear-team" | "custom">, number[]> = {
  linear: [0, 1, 2, 3, 4, 5],
  fibonacci: [0, 1, 2, 3, 5, 8, 13],
  "powers-of-two": [0, 1, 2, 4, 8, 16, 32],
};

export function presetPointValues(
  preset: PointingPreset,
  customValues: number[] = [],
): number[] {
  if (preset === "linear-team") return [];
  if (preset === "custom") return customValues;
  return PRESET_VALUES[preset];
}

export function linearTeamEstimateCards(
  team: LinearTeamSummary,
): EstimateCard[] {
  let cards: EstimateCard[];
  switch (team.issueEstimationType) {
    case "exponential":
      cards = [1, 2, 4, 8, 16, ...(team.issueEstimationExtended ? [32, 64] : [])]
        .map((value) => ({ value, label: `${value}` }));
      break;
    case "fibonacci":
      cards = [1, 2, 3, 5, 8, ...(team.issueEstimationExtended ? [13, 21] : [])]
        .map((value) => ({ value, label: `${value}` }));
      break;
    case "linear":
      cards = [1, 2, 3, 4, 5, ...(team.issueEstimationExtended ? [6, 7] : [])]
        .map((value) => ({ value, label: `${value}` }));
      break;
    case "tShirt": {
      const values = [1, 2, 3, 5, 8, ...(team.issueEstimationExtended ? [13, 21] : [])];
      const labels = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
      cards = values.map((value, index) => ({ value, label: labels[index] }));
      break;
    }
    default:
      cards = [];
  }
  return team.issueEstimationAllowZero
    ? [{ value: 0, label: "0" }, ...cards]
    : cards;
}

export function resolvePointingCards(
  settings: Pick<UserSettings, "pointingPreset" | "customPointValues">,
  team: LinearTeamSummary,
): EstimateCard[] {
  const teamCards = linearTeamEstimateCards(team);
  if (!teamCards.length) {
    throw new Error(`${team.name} does not have estimates enabled in Linear`);
  }
  if (settings.pointingPreset === "linear-team") return teamCards;

  const values = presetPointValues(
    settings.pointingPreset,
    settings.customPointValues,
  );
  const accepted = new Set(teamCards.map((card) => card.value));
  const unsupported = values.filter((value) => !accepted.has(value));
  if (unsupported.length) {
    throw new Error(
      `Your deck includes ${unsupported.join(", ")}, which ${team.name} does not accept. Use the Linear team deck or update this team's estimate scale.`,
    );
  }
  return values.map((value) => ({ value, label: `${value}` }));
}

export function voteLabel(
  value: VoteValue,
  cards: EstimateCard[],
): string {
  return cards.find((card) => card.value === value)?.label ?? `${value}`;
}

export function isFinalizableEstimate(
  value: unknown,
  cards: EstimateCard[],
): value is number {
  return (
    typeof value === "number" &&
    cards.some((candidate) => candidate.value === value)
  );
}
