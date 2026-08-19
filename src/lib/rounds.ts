import type {
  ParticipantRole,
  QueueItemStatus,
  RoundStatus,
} from "@/lib/domain";

export function shouldAutoReveal(
  eligibleVoterIds: readonly string[],
  votedUserIds: readonly string[],
): boolean {
  if (eligibleVoterIds.length === 0) return false;
  const voted = new Set(votedUserIds);
  return eligibleVoterIds.every((userId) => voted.has(userId));
}

export function canVote(
  userId: string,
  eligibleVoterIds: readonly string[],
  status: RoundStatus,
): boolean {
  return status === "voting" && eligibleVoterIds.includes(userId);
}

export function canFacilitate(role: ParticipantRole): boolean {
  return role === "facilitator";
}

export function averageVote(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function roundedUpAverageVote(
  values: readonly number[],
  availableValues: readonly number[],
): { average: number; estimate: number } | null {
  const average = averageVote(values);
  if (average === null || availableValues.length === 0) return null;
  const sortedValues = [...new Set(availableValues)].sort(
    (left, right) => left - right,
  );
  return {
    average,
    estimate:
      sortedValues.find((value) => value >= average) ??
      sortedValues[sortedValues.length - 1],
  };
}

export function nextPendingItemId(
  items: ReadonlyArray<{
    id: string;
    position: number;
    status: QueueItemStatus;
  }>,
  currentItemId: string,
): string | null {
  const current = items.find((item) => item.id === currentItemId);
  if (!current) return null;
  return (
    [...items]
      .sort((a, b) => a.position - b.position)
      .find(
        (item) =>
          item.position > current.position && item.status === "pending",
      )?.id ?? null
  );
}

export function publicVoteValue<T>(
  roundStatus: RoundStatus,
  voteValue: T,
): T | null {
  return roundStatus === "revealed" || roundStatus === "finalized"
    ? voteValue
    : null;
}

export function voteValueForViewer<T>(
  roundStatus: RoundStatus,
  viewerUserId: string,
  voterUserId: string,
  voteValue: T,
): T | null {
  return viewerUserId === voterUserId
    ? voteValue
    : publicVoteValue(roundStatus, voteValue);
}

export function shouldAddNewVoterToRound(status: RoundStatus): boolean {
  return status === "voting";
}
