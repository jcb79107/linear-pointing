import "server-only";

import {
  LinearClient,
  PaginationOrderBy,
  type Issue,
  type WorkflowState,
} from "@linear/sdk";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { linearConnections } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import type {
  EstimateScaleType,
  LinearIssueSummary,
  LinearTeamSummary,
  PointableStateType,
  TicketAssigneeScope,
  TicketEstimateScope,
} from "@/lib/domain";
import { getServerEnv } from "@/lib/env";
import {
  findUpcomingLinearCycle,
  sortByLinearManualOrder,
  type UpcomingLinearCycle,
} from "@/lib/linear-order";
import { isPointableLinearIssue } from "@/lib/pointing-eligibility";

interface LinearTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string | string[];
}

export interface IssueSearchFilters {
  teamId: string;
  query?: string;
  cycleId?: string;
  projectId?: string;
  labelId?: string;
  stateTypes: PointableStateType[];
  estimateScope: TicketEstimateScope;
  assigneeScope: TicketAssigneeScope;
  assigneeId: string;
}

export interface LinearIssueFilterOptions {
  activeCycle: UpcomingLinearCycle | null;
  upcomingCycle: UpcomingLinearCycle | null;
}

function parseScopes(value: string | string[]): string[] {
  return Array.isArray(value)
    ? value
    : value.split(/[,\s]+/).filter(Boolean);
}

export async function getLinearAccessToken(userId: string): Promise<{
  accessToken: string;
  scopes: string[];
}> {
  const [connection] = await db
    .select()
    .from(linearConnections)
    .where(eq(linearConnections.userId, userId))
    .limit(1);

  if (!connection) throw new Error("Linear connection not found");
  if (connection.expiresAt.getTime() > Date.now() + 5 * 60_000) {
    return {
      accessToken: decryptSecret(connection.encryptedAccessToken),
      scopes: connection.scopes,
    };
  }

  const env = getServerEnv();
  const response = await fetch("https://api.linear.app/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptSecret(connection.encryptedRefreshToken),
      client_id: env.LINEAR_CLIENT_ID,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Linear token refresh failed (${response.status})`);
  }

  const tokens = (await response.json()) as LinearTokenResponse;
  const scopes = parseScopes(tokens.scope);
  await db
    .update(linearConnections)
    .set({
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: encryptSecret(tokens.refresh_token),
      scopes,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      updatedAt: new Date(),
    })
    .where(eq(linearConnections.userId, userId));

  return { accessToken: tokens.access_token, scopes };
}

export async function getLinearClient(userId: string): Promise<LinearClient> {
  const { accessToken } = await getLinearAccessToken(userId);
  return new LinearClient({ accessToken });
}

export async function listLinearTeams(
  userId: string,
): Promise<LinearTeamSummary[]> {
  const client = await getLinearClient(userId);
  const connection = await client.teams({ first: 100 });
  return connection.nodes
    .filter((team) => team.issueEstimationType !== "notUsed")
    .map((team) => ({
      id: team.id,
      key: team.key,
      name: team.name,
      issueEstimationType: team.issueEstimationType as EstimateScaleType,
      issueEstimationAllowZero: team.issueEstimationAllowZero,
      issueEstimationExtended: team.issueEstimationExtended,
    }));
}

export async function getLinearTeam(
  userId: string,
  teamId: string,
): Promise<LinearTeamSummary> {
  const client = await getLinearClient(userId);
  const team = await client.team(teamId);
  return {
    id: team.id,
    key: team.key,
    name: team.name,
    issueEstimationType: team.issueEstimationType as EstimateScaleType,
    issueEstimationAllowZero: team.issueEstimationAllowZero,
    issueEstimationExtended: team.issueEstimationExtended,
  };
}

async function summarizeIssue(
  issue: Issue,
  includeChildren = false,
): Promise<LinearIssueSummary> {
  const [team, state, assignee, project, labels, children, attachments] =
    await Promise.all([
      issue.team,
      issue.state,
      issue.assignee,
      issue.project,
      issue.labels(),
      includeChildren ? issue.children({ first: 25 }) : Promise.resolve(null),
      includeChildren
        ? issue.attachments({ first: 25 })
        : Promise.resolve(null),
    ]);
  if (!team) throw new Error(`Linear issue ${issue.identifier} has no team`);
  const subIssues = children
    ? await Promise.all(
        children.nodes.map(async (child) => ({
          id: child.id,
          identifier: child.identifier,
          title: child.title,
          stateName: (await child.state)?.name ?? null,
        })),
      )
    : [];

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    url: issue.url,
    priorityLabel: issue.priorityLabel || null,
    priority: issue.priority,
    sortOrder: issue.sortOrder,
    stateName: state?.name ?? null,
    stateType: state?.type ?? null,
    assigneeName: assignee?.displayName ?? null,
    projectName: project?.name ?? null,
    labels: labels.nodes.map((label) => label.name),
    subIssues,
    attachments:
      attachments?.nodes.map((attachment) => ({
        id: attachment.id,
        title: attachment.title,
        subtitle: attachment.subtitle ?? null,
        url: attachment.url,
        sourceType: attachment.sourceType ?? null,
      })) ?? [],
    estimate: issue.estimate ?? null,
    teamId: team.id,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    dueDate: issue.dueDate ?? null,
  };
}

async function summarizeIssueForSearch(
  issue: Issue,
  teamId: string,
  knownState?: WorkflowState,
): Promise<LinearIssueSummary> {
  const state = knownState ?? (await issue.state);
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: null,
    url: issue.url,
    priorityLabel: issue.priorityLabel || null,
    priority: issue.priority,
    sortOrder: issue.sortOrder,
    stateName: state?.name ?? null,
    stateType: state?.type ?? null,
    assigneeName: null,
    projectName: null,
    labels: [],
    subIssues: [],
    attachments: [],
    estimate: issue.estimate ?? null,
    teamId,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    dueDate: issue.dueDate ?? null,
  };
}

export async function searchLinearIssues(
  userId: string,
  filters: IssueSearchFilters,
  options: { fetchAll?: boolean; preserveManualOrder?: boolean } = {},
): Promise<LinearIssueSummary[]> {
  const client = await getLinearClient(userId);
  const identifierQuery = filters.query?.trim().toUpperCase();
  if (identifierQuery && /^[A-Z][A-Z0-9]*-\d+$/.test(identifierQuery)) {
    try {
      const issue = await client.issue(identifierQuery);
      const [team, cycle, project, state, labels, assignee] = await Promise.all([
        issue.team,
        filters.cycleId ? issue.cycle : Promise.resolve(undefined),
        filters.projectId ? issue.project : Promise.resolve(undefined),
        issue.state,
        filters.labelId ? issue.labels() : Promise.resolve(undefined),
        filters.assigneeScope === "anyone"
          ? Promise.resolve(undefined)
          : issue.assignee,
      ]);
      const policyMatches = isPointableLinearIssue(
        {
          estimate: issue.estimate ?? null,
          stateType: state?.type ?? null,
        },
        {
          stateTypes: filters.stateTypes,
          estimateScope: filters.estimateScope,
        },
      );
      const assigneeMatches =
        filters.assigneeScope === "anyone" ||
        (filters.assigneeScope === "me" && assignee?.id === filters.assigneeId) ||
        (filters.assigneeScope === "unassigned" && !assignee);
      const matches =
        team?.id === filters.teamId &&
        policyMatches &&
        assigneeMatches &&
        (!filters.cycleId || cycle?.id === filters.cycleId) &&
        (!filters.projectId || project?.id === filters.projectId) &&
        (!filters.labelId ||
          labels?.nodes.some((label) => label.id === filters.labelId));
      return matches
        ? [await summarizeIssueForSearch(issue, filters.teamId, state)]
        : [];
    } catch {
      return [];
    }
  }
  const filter = {
    team: { id: { eq: filters.teamId } },
    ...(filters.query
      ? { title: { containsIgnoreCase: filters.query } }
      : {}),
    ...(filters.cycleId
      ? { cycle: { id: { eq: filters.cycleId } } }
      : {}),
    ...(filters.projectId
      ? { project: { id: { eq: filters.projectId } } }
      : {}),
    ...(filters.labelId
      ? { labels: { id: { eq: filters.labelId } } }
      : {}),
    state: { type: { in: filters.stateTypes } },
    ...(filters.estimateScope === "unestimated"
      ? { estimate: { null: true } }
      : filters.estimateScope === "estimated"
        ? { estimate: { null: false } }
        : {}),
    ...(filters.assigneeScope === "me"
      ? { assignee: { id: { eq: filters.assigneeId } } }
      : filters.assigneeScope === "unassigned"
        ? { assignee: { null: true } }
        : {}),
  };

  const issues = await client.issues({
    first: 50,
    orderBy: PaginationOrderBy.UpdatedAt,
    filter,
  });

  while (options.fetchAll && issues.pageInfo.hasNextPage) {
    await issues.fetchNext();
  }

  const orderedIssues = options.preserveManualOrder
    ? sortByLinearManualOrder(issues.nodes)
    : issues.nodes;

  return Promise.all(
    orderedIssues.map((issue) =>
      summarizeIssueForSearch(issue, filters.teamId),
    ),
  );
}

export async function getUpcomingLinearCycle(
  userId: string,
  teamId: string,
): Promise<UpcomingLinearCycle | null> {
  const client = await getLinearClient(userId);
  const team = await client.team(teamId);
  const cycles = await team.cycles({
    first: 50,
    filter: { isFuture: { eq: true } },
  });
  return findUpcomingLinearCycle(cycles.nodes);
}

export async function getLinearIssueFilterOptions(
  userId: string,
  teamId: string,
): Promise<LinearIssueFilterOptions> {
  const client = await getLinearClient(userId);
  const team = await client.team(teamId);
  const [activeCycle, cycles] = await Promise.all([
    team.activeCycle,
    team.cycles({
      first: 50,
      filter: { isFuture: { eq: true } },
    }),
  ]);
  return {
    activeCycle: activeCycle
      ? {
          id: activeCycle.id,
          name: activeCycle.name ?? `Cycle ${activeCycle.number}`,
          number: activeCycle.number,
        }
      : null,
    upcomingCycle: findUpcomingLinearCycle(cycles.nodes),
  };
}

export async function getLinearIssue(
  userId: string,
  issueId: string,
): Promise<LinearIssueSummary> {
  const client = await getLinearClient(userId);
  return summarizeIssue(await client.issue(issueId), true);
}

export async function updateLinearIssueEstimate(
  userId: string,
  issueId: string,
  estimate: number,
): Promise<LinearIssueSummary> {
  const { scopes } = await getLinearAccessToken(userId);
  if (!scopes.includes("write")) {
    throw new Error("Linear write permission is required");
  }
  const client = await getLinearClient(userId);
  const payload = await client.updateIssue(issueId, { estimate });
  const issue = await payload.issue;
  if (!payload.success || !issue) {
    throw new Error("Linear did not confirm the estimate update");
  }
  return summarizeIssue(issue);
}

export async function userHasTeamAccess(
  userId: string,
  teamId: string,
): Promise<boolean> {
  try {
    const team = await getLinearTeam(userId, teamId);
    return team.id === teamId;
  } catch {
    return false;
  }
}

export async function hasLinearWriteScope(userId: string): Promise<boolean> {
  const [connection] = await db
    .select({ scopes: linearConnections.scopes })
    .from(linearConnections)
    .where(eq(linearConnections.userId, userId))
    .limit(1);
  return connection?.scopes.includes("write") ?? false;
}
