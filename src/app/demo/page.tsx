import { LiveRoom } from "@/components/LiveRoom";
import type { SessionSnapshot } from "@/lib/domain";

const demoSnapshot: SessionSnapshot = {
  id: "demo-session",
  code: "DEMO2026",
  title: "API grooming · July 30",
  status: "live",
  teamId: "demo-team",
  teamName: "Platform API",
  scaleType: "linear",
  estimateCards: [0, 1, 2, 3, 4].map((value) => ({
    value,
    label: `${value}`,
  })),
  currentUserId: "u4",
  currentUserRole: "facilitator",
  activeItemId: "q1",
  queue: [
    {
      id: "q1",
      linearIssueId: "linear-342",
      identifier: "API-342",
      title: "Retry failed webhook deliveries",
      description:
        "Add exponential backoff for failed webhook deliveries and surface the latest delivery status to workspace admins.\n\n[Figma design](https://www.figma.com/design/demo/Pointline-Demo)\n\n### Acceptance criteria\n\n- Retry on `429` and `5xx` responses\n- Cap retries after 24 hours\n- Show the next retry time in the delivery log\n- Preserve the original request body for every attempt",
      url: "https://linear.app",
      priorityLabel: "High",
      stateName: "Todo",
      assigneeName: "Ari Kim",
      projectName: "API reliability",
      labels: ["Backend", "Reliability"],
      subIssues: [
        {
          id: "sub-1",
          identifier: "API-343",
          title: "Persist delivery attempt history",
          stateName: "In Progress",
        },
        {
          id: "sub-2",
          identifier: "API-344",
          title: "Add retry timing to the delivery log",
          stateName: "Todo",
        },
      ],
      attachments: [
        {
          id: "figma-1",
          title: "Webhook delivery log",
          subtitle: "Figma design",
          url: "https://www.figma.com/design/demo/Pointline-Demo",
          sourceType: "figma",
        },
      ],
      position: 0,
      status: "active",
      currentEstimate: null,
      finalEstimate: null,
    },
    {
      id: "q2",
      linearIssueId: "linear-351",
      identifier: "API-351",
      title: "Add workspace usage limits",
      description:
        "Protect shared infrastructure with configurable request limits per workspace.",
      url: "https://linear.app",
      priorityLabel: "Medium",
      stateName: "Todo",
      assigneeName: "Nina Singh",
      projectName: "Platform controls",
      labels: ["Backend"],
      subIssues: [],
      attachments: [],
      position: 1,
      status: "pending",
      currentEstimate: null,
      finalEstimate: null,
    },
    {
      id: "q3",
      linearIssueId: "linear-355",
      identifier: "API-355",
      title: "Audit log CSV export",
      description:
        "Allow admins to export filtered audit events from workspace settings.",
      url: "https://linear.app",
      priorityLabel: "Low",
      stateName: "Todo",
      assigneeName: null,
      projectName: "Admin experience",
      labels: ["Customer request"],
      subIssues: [],
      attachments: [],
      position: 2,
      status: "pending",
      currentEstimate: null,
      finalEstimate: null,
    },
  ],
  participants: [
    {
      id: "u1",
      linearUserId: "linear-u1",
      name: "Ari Kim",
      avatarUrl: null,
      role: "voter",
      online: true,
      hasVoted: true,
      vote: null,
    },
    {
      id: "u2",
      linearUserId: "linear-u2",
      name: "Riley Lee",
      avatarUrl: null,
      role: "voter",
      online: true,
      hasVoted: true,
      vote: null,
    },
    {
      id: "u3",
      linearUserId: "linear-u3",
      name: "Nina Singh",
      avatarUrl: null,
      role: "voter",
      online: true,
      hasVoted: true,
      vote: null,
    },
    {
      id: "u4",
      linearUserId: "linear-u4",
      name: "Jason Miller",
      avatarUrl: null,
      role: "facilitator",
      online: true,
      hasVoted: false,
      vote: null,
    },
  ],
  round: {
    id: "demo-round-q1",
    number: 1,
    status: "voting",
    eligibleVoterIds: ["u1", "u2", "u3"],
    estimateAtStart: null,
    revealedAt: null,
  },
};

export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const initialSnapshot =
    role === "voter"
      ? {
          ...demoSnapshot,
          currentUserId: "u1",
          currentUserRole: "voter" as const,
        }
      : demoSnapshot;
  return <LiveRoom demoMode initialSnapshot={initialSnapshot} />;
}
