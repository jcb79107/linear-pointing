import type { QueueItemStatus, SessionStatus } from "@/lib/domain";

export function canAddQueueItems(status: SessionStatus): boolean {
  return status === "draft" || status === "live";
}

export function canClearQueue(status: SessionStatus): boolean {
  return status === "draft";
}

export function queueItemRemovalError(
  sessionStatus: SessionStatus,
  itemStatus: QueueItemStatus,
): string | null {
  if (sessionStatus === "ended") return "Ended sessions cannot be changed";
  if (sessionStatus === "live" && itemStatus === "active") {
    return "The active ticket cannot be removed";
  }
  if (
    sessionStatus === "live" &&
    (itemStatus === "estimated" || itemStatus === "skipped")
  ) {
    return "Discussed tickets stay in the session history";
  }
  return null;
}
