export function accumulatedElapsedSeconds(
  baseSeconds: number,
  activeStartedAt: Date | string | null,
  at: Date | number = Date.now(),
) {
  if (!activeStartedAt) return baseSeconds;
  const start =
    typeof activeStartedAt === "string"
      ? Date.parse(activeStartedAt)
      : activeStartedAt.getTime();
  const end = typeof at === "number" ? at : at.getTime();
  if (!Number.isFinite(start)) return baseSeconds;
  return baseSeconds + Math.max(0, Math.floor((end - start) / 1000));
}
