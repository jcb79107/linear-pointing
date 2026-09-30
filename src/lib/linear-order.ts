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

// Cycle offsets count scheduled cycles, not weeks; this also handles cooldowns.
export function resolveCycleOffset<T extends { startsAt: Date; endsAt: Date }>(cycles: readonly T[], offset: 0 | 1 | 2 | 3, now = new Date()): T | null {
  if (offset === 0) return cycles.find(c => c.startsAt <= now && c.endsAt > now) ?? null;
  return [...cycles].filter(c => c.startsAt > now).sort((a, b) => +a.startsAt - +b.startsAt)[offset - 1] ?? null;
}
