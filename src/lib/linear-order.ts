export interface LinearManualOrderItem {
  sortOrder: number;
}

export interface LinearCycleCandidate {
  id: string;
  isNext: boolean;
  name?: string | null;
  number: number;
  startsAt: Date;
}

export interface UpcomingLinearCycle {
  id: string;
  name: string;
  number: number;
}

export function sortByLinearManualOrder<T extends LinearManualOrderItem>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function findUpcomingLinearCycle(
  cycles: readonly LinearCycleCandidate[],
  now = new Date(),
): UpcomingLinearCycle | null {
  const next =
    cycles.find((cycle) => cycle.isNext) ??
    [...cycles]
      .filter((cycle) => cycle.startsAt.getTime() > now.getTime())
      .sort(
        (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
      )[0];

  if (!next) return null;
  return {
    id: next.id,
    name: next.name ?? `Cycle ${next.number}`,
    number: next.number,
  };
}
