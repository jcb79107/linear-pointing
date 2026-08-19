export type SessionStatus = "draft" | "live" | "ended";
export type QueueItemStatus = "pending" | "active" | "estimated" | "skipped";
export type ParticipantRole = "facilitator" | "voter" | "observer";
export type RoundStatus = "voting" | "revealed" | "finalized" | "abandoned";
export type GroomingOutcome =
  | "ready"
  | "needs-work"
  | "split"
  | "parked";
export type EstimateScaleType =
  | "notUsed"
  | "exponential"
  | "fibonacci"
  | "linear"
  | "tShirt";
export type VoteValue = number;
export type RoundSignal = "needs-context";

export interface EstimateCard {
  value: number;
  label: string;
}

export interface SessionUser {
  id: string;
  linearUserId: string;
  name: string;
  avatarUrl: string | null;
}

export interface SessionParticipant extends SessionUser {
  role: ParticipantRole;
  votingEnabled: boolean;
  online: boolean;
  hasVoted: boolean;
  vote: VoteValue | null;
  signal: RoundSignal | null;
}

export interface SessionQueueItem {
  id: string;
  linearIssueId: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  priorityLabel: string | null;
  priority: number;
  linearSortOrder: number;
  stateName: string | null;
  assigneeName: string | null;
  projectName: string | null;
  labels: string[];
  subIssues: Array<{
    id: string;
    identifier: string;
    title: string;
    stateName: string | null;
  }>;
  attachments: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    url: string;
    sourceType: string | null;
  }>;
  position: number;
  status: QueueItemStatus;
  currentEstimate: number | null;
  finalEstimate: number | null;
  groomingOutcome: GroomingOutcome | null;
  groomingNote: string | null;
  decidedAt: string | null;
  activeStartedAt: string | null;
  elapsedSeconds: number;
  linearCreatedAt: string | null;
  linearUpdatedAt: string | null;
  dueDate: string | null;
}

export interface SessionRound {
  id: string;
  number: number;
  status: RoundStatus;
  eligibleVoterIds: string[];
  estimateAtStart: number | null;
  revealedAt: string | null;
  createdAt: string;
}

export interface SessionSnapshot {
  id: string;
  code: string;
  title: string;
  status: SessionStatus;
  startedAt: string | null;
  endedAt: string | null;
  activeStartedAt: string | null;
  elapsedSeconds: number;
  teamId: string;
  teamName: string;
  scaleType: EstimateScaleType;
  estimateCards: EstimateCard[];
  currentUserId: string;
  currentUserRole: ParticipantRole;
  activeItemId: string | null;
  queue: SessionQueueItem[];
  participants: SessionParticipant[];
  round: SessionRound | null;
}

export interface LinearTeamSummary {
  id: string;
  key: string;
  name: string;
  issueEstimationType: EstimateScaleType;
  issueEstimationAllowZero: boolean;
  issueEstimationExtended: boolean;
}

export interface LinearIssueSummary {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  priorityLabel: string | null;
  priority: number;
  sortOrder: number;
  stateName: string | null;
  stateType: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  projectName: string | null;
  labels: string[];
  subIssues: Array<{
    id: string;
    identifier: string;
    title: string;
    stateName: string | null;
  }>;
  attachments: Array<{
    id: string;
    title: string;
    subtitle: string | null;
    url: string;
    sourceType: string | null;
  }>;
  estimate: number | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
}

export type PointingPreset =
  | "linear-team"
  | "linear"
  | "fibonacci"
  | "powers-of-two"
  | "custom";

export type TicketCycleScope = "upcoming" | "active" | "any";
export type TicketEstimateScope = "unestimated" | "estimated" | "any";
export type TicketAssigneeScope = "anyone" | "me" | "unassigned";
export type PointableStateType = "backlog" | "unstarted" | "started";
export type QueueSortPreset =
  | "manual"
  | "linear"
  | "priority"
  | "oldest"
  | "newest"
  | "updated"
  | "identifier"
  | "title"
  | "custom";
export type QueueSortField =
  | "priority"
  | "createdAt"
  | "updatedAt"
  | "identifier"
  | "title"
  | "estimate";
export type SortDirection = "asc" | "desc";

export interface QueueSortRule {
  field: QueueSortField;
  direction: SortDirection;
}

export interface UserSettings {
  pointingPreset: PointingPreset;
  customPointValues: number[];
  autoReveal: boolean;
  cycleScope: TicketCycleScope;
  stateTypes: PointableStateType[];
  estimateScope: TicketEstimateScope;
  assigneeScope: TicketAssigneeScope;
  defaultSort: QueueSortPreset;
  customSortRules: QueueSortRule[];
}
