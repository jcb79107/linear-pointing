export type SessionStatus = "draft" | "live" | "ended";
export type QueueItemStatus = "pending" | "active" | "estimated" | "skipped";
export type ParticipantRole = "facilitator" | "voter" | "observer";
export type RoundStatus = "voting" | "revealed" | "finalized" | "abandoned";
export type EstimateScaleType =
  | "notUsed"
  | "exponential"
  | "fibonacci"
  | "linear"
  | "tShirt";
export type VoteValue = number;

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
  online: boolean;
  hasVoted: boolean;
  vote: VoteValue | null;
}

export interface SessionQueueItem {
  id: string;
  linearIssueId: string;
  identifier: string;
  title: string;
  description: string | null;
  url: string;
  priorityLabel: string | null;
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
}

export interface SessionRound {
  id: string;
  number: number;
  status: RoundStatus;
  eligibleVoterIds: string[];
  estimateAtStart: number | null;
  revealedAt: string | null;
}

export interface SessionSnapshot {
  id: string;
  code: string;
  title: string;
  status: SessionStatus;
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
  stateName: string | null;
  stateType: string | null;
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
  estimate: number | null;
  teamId: string;
}
