import type {
  EstimateCard,
  VoteValue,
} from "@/lib/domain";

export const POINTING_CARDS: EstimateCard[] = [0, 1, 2, 3, 4].map(
  (value) => ({
    value,
    label: `${value}`,
  }),
);

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
