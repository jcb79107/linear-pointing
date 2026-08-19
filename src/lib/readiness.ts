import type { SessionQueueItem } from "@/lib/domain";

export interface ReadinessCheck {
  id: "description" | "acceptance-criteria" | "owner" | "project";
  label: string;
  ready: boolean;
}

const acceptanceCriteriaPattern =
  /(^|\n)#{1,4}\s*(acceptance criteria|requirements|definition of done)\b|(^|\n)\s*[-*]\s*\[[ xX]\]/i;

export function readinessChecks(
  item: Pick<
    SessionQueueItem,
    "description" | "assigneeName" | "projectName"
  >,
): ReadinessCheck[] {
  const description = item.description?.trim() ?? "";
  return [
    {
      id: "description",
      label: "Description",
      ready: description.length >= 20,
    },
    {
      id: "acceptance-criteria",
      label: "Acceptance criteria",
      ready: acceptanceCriteriaPattern.test(description),
    },
    { id: "owner", label: "Owner", ready: Boolean(item.assigneeName) },
    { id: "project", label: "Project", ready: Boolean(item.projectName) },
  ];
}

export function readinessScore(item: Parameters<typeof readinessChecks>[0]) {
  const checks = readinessChecks(item);
  return {
    ready: checks.filter((check) => check.ready).length,
    total: checks.length,
  };
}

export function contextReadinessScore(
  item: Pick<SessionQueueItem, "description">,
) {
  const checks = readinessChecks({
    description: item.description,
    assigneeName: null,
    projectName: null,
  }).filter(
    (check) =>
      check.id === "description" || check.id === "acceptance-criteria",
  );
  return {
    ready: checks.filter((check) => check.ready).length,
    total: checks.length,
  };
}
