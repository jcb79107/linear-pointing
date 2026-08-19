import type {
  QueueSortPreset,
  QueueSortRule,
  SessionQueueItem,
} from "@/lib/domain";

function compareNullableNumbers(
  left: number | null,
  right: number | null,
  direction: QueueSortRule["direction"],
) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = left - right;
  return direction === "desc" ? comparison * -1 : comparison;
}

function issueNumber(identifier: string): number {
  const match = identifier.match(/-(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function compareRule(
  left: SessionQueueItem,
  right: SessionQueueItem,
  rule: QueueSortRule,
): number {
  let comparison = 0;
  switch (rule.field) {
    case "priority": {
      const leftPriority = left.priority || null;
      const rightPriority = right.priority || null;
      return compareNullableNumbers(leftPriority, rightPriority, rule.direction);
    }
    case "createdAt":
      return compareNullableNumbers(
        left.linearCreatedAt ? Date.parse(left.linearCreatedAt) : null,
        right.linearCreatedAt ? Date.parse(right.linearCreatedAt) : null,
        rule.direction,
      );
    case "updatedAt":
      return compareNullableNumbers(
        left.linearUpdatedAt ? Date.parse(left.linearUpdatedAt) : null,
        right.linearUpdatedAt ? Date.parse(right.linearUpdatedAt) : null,
        rule.direction,
      );
    case "identifier":
      comparison = issueNumber(left.identifier) - issueNumber(right.identifier);
      break;
    case "title":
      comparison = left.title.localeCompare(right.title);
      break;
    case "estimate":
      return compareNullableNumbers(
        left.currentEstimate,
        right.currentEstimate,
        rule.direction,
      );
  }
  return rule.direction === "desc" ? comparison * -1 : comparison;
}

export function rulesForSortPreset(
  preset: QueueSortPreset,
  customRules: QueueSortRule[],
): QueueSortRule[] {
  switch (preset) {
    case "priority":
      return [
        { field: "priority", direction: "asc" },
        { field: "identifier", direction: "asc" },
      ];
    case "oldest":
      return [{ field: "createdAt", direction: "asc" }];
    case "newest":
      return [{ field: "createdAt", direction: "desc" }];
    case "updated":
      return [{ field: "updatedAt", direction: "desc" }];
    case "identifier":
      return [{ field: "identifier", direction: "asc" }];
    case "title":
      return [{ field: "title", direction: "asc" }];
    case "custom":
      return customRules;
    default:
      return [];
  }
}

export function sortQueueItems(
  items: readonly SessionQueueItem[],
  preset: QueueSortPreset,
  customRules: QueueSortRule[] = [],
): SessionQueueItem[] {
  if (preset === "linear") {
    return [...items].sort((left, right) => left.linearSortOrder - right.linearSortOrder);
  }
  const rules = rulesForSortPreset(preset, customRules);
  return [...items].sort((left, right) => {
    for (const rule of rules) {
      const result = compareRule(left, right, rule);
      if (result !== 0) return result;
    }
    return left.position - right.position;
  });
}
