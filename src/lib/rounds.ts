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

export function majorityVote(
  values: readonly number[],
): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || rightValue - leftValue,
    )[0][0];
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
