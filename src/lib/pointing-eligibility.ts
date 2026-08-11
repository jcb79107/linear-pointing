export const LINEAR_TODO_STATE_TYPE = "unstarted";

export interface PointingEligibilityInput {
  estimate: number | null;
  stateType: string | null;
}

export function isPointableLinearIssue(
  issue: PointingEligibilityInput,
): boolean {
  return (
    issue.estimate === null && issue.stateType === LINEAR_TODO_STATE_TYPE
  );
}

export function pointingEligibilityError(
  issue: PointingEligibilityInput,
  identifier = "This ticket",
): string | null {
  if (issue.stateType !== LINEAR_TODO_STATE_TYPE) {
    return `${identifier} must be in Todo before it can be pointed`;
  }
  if (issue.estimate !== null) {
    return `${identifier} already has points in Linear`;
  }
  return null;
}
