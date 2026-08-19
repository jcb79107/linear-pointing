import type {
  PointableStateType,
  TicketEstimateScope,
} from "@/lib/domain";

export const LINEAR_TODO_STATE_TYPE = "unstarted";
export const DEFAULT_POINTING_POLICY: PointingEligibilityPolicy = {
  stateTypes: ["unstarted"],
  estimateScope: "unestimated",
};

export interface PointingEligibilityPolicy {
  stateTypes: PointableStateType[];
  estimateScope: TicketEstimateScope;
}

export interface PointingEligibilityInput {
  estimate: number | null;
  stateType: string | null;
}

export function isPointableLinearIssue(
  issue: PointingEligibilityInput,
  policy: PointingEligibilityPolicy = DEFAULT_POINTING_POLICY,
): boolean {
  const stateMatches = policy.stateTypes.includes(
    issue.stateType as PointableStateType,
  );
  const estimateMatches =
    policy.estimateScope === "any" ||
    (policy.estimateScope === "unestimated" && issue.estimate === null) ||
    (policy.estimateScope === "estimated" && issue.estimate !== null);
  return stateMatches && estimateMatches;
}

export function isEstimableLinearIssue(
  issue: Pick<PointingEligibilityInput, "stateType">,
): boolean {
  return ["backlog", "unstarted", "started"].includes(issue.stateType ?? "");
}

export function pointingEligibilityError(
  issue: PointingEligibilityInput,
  identifier = "This ticket",
  policy: PointingEligibilityPolicy = DEFAULT_POINTING_POLICY,
): string | null {
  if (!policy.stateTypes.includes(issue.stateType as PointableStateType)) {
    return `${identifier} is not in one of the selected Linear statuses`;
  }
  if (policy.estimateScope === "unestimated" && issue.estimate !== null) {
    return `${identifier} already has points in Linear`;
  }
  if (policy.estimateScope === "estimated" && issue.estimate === null) {
    return `${identifier} does not have an estimate in Linear`;
  }
  return null;
}
