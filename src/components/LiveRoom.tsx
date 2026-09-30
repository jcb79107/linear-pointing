/* eslint-disable @next/next/no-img-element */
"use client";

import { FeedbackButton } from "@/components/FeedbackButton";

import type Pusher from "pusher-js";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDot,
  CirclePlus,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Keyboard,
  LoaderCircle,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Search,
  SkipForward,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Brand, PointedMark } from "@/components/Brand";
import { SlackInviteButton } from "@/components/SlackInviteButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { requestJson } from "@/lib/client-request";
import type {
  GroomingOutcome,
  LinearIssueSummary,
  ParticipantRole,
  SessionParticipant,
  SessionSnapshot,
  VoteValue,
} from "@/lib/domain";
import { voteLabel } from "@/lib/estimates";
import {
  extractFigmaUrls,
  figmaEmbedUrl,
  figmaPreviewTitle,
  isFigmaUrl,
} from "@/lib/figma";
import { roundedUpAverageVote } from "@/lib/rounds";
import { accumulatedElapsedSeconds } from "@/lib/timing";

interface LiveRoomProps {
  initialSnapshot: SessionSnapshot;
  demoMode?: boolean;

}

interface RoomApiResponse {
  error?: string;
  snapshot?: SessionSnapshot;
}


function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function proxiedLinearMediaUrl(source?: string) {
  if (!source?.startsWith("https://")) return "";
  return `/api/linear/media?url=${encodeURIComponent(source)}`;
}

function localVote(
  snapshot: SessionSnapshot,
  userId: string,
  value: VoteValue,
): SessionSnapshot {
  const participants = snapshot.participants.map((person) =>
    person.id === userId
      ? { ...person, hasVoted: true, vote: value, signal: null }
      : person,
  );
  const allVoted =
    snapshot.round?.eligibleVoterIds.every(
      (id) => participants.find((person) => person.id === id)?.hasVoted,
    ) ?? false;
  const revealedParticipants = participants.map((person, index) =>
    snapshot.round?.eligibleVoterIds.includes(person.id)
      ? {
          ...person,
          vote: person.vote ?? ([1, 2, 4, 4][index] as VoteValue),
        }
      : { ...person, hasVoted: false, vote: null },
  );
  return {
    ...snapshot,
    participants: allVoted
      ? revealedParticipants
      : participants.map((person) => ({
          ...person,
          vote: person.id === userId ? person.vote : null,
        })),
    round: snapshot.round
      ? {
          ...snapshot.round,
          status: allVoted ? "revealed" : "voting",
          revealedAt: allVoted ? new Date().toISOString() : null,
        }
      : null,
  };
}

function optimisticVote(
  snapshot: SessionSnapshot,
  userId: string,
  value: VoteValue,
): SessionSnapshot {
  return {
    ...snapshot,
    participants: snapshot.participants.map((person) =>
      person.id === userId
        ? { ...person, hasVoted: true, vote: value, signal: null }
        : person,
    ),
  };
}

function localRound(
  snapshot: SessionSnapshot,
  queueItemId: string,
): NonNullable<SessionSnapshot["round"]> {
  return {
    id: `demo-round-${queueItemId}`,
    number: 1,
    status: "voting",
    eligibleVoterIds: snapshot.participants
      .filter((person) => person.votingEnabled)
      .map((person) => person.id),
    estimateAtStart:
      snapshot.queue.find((item) => item.id === queueItemId)?.currentEstimate ??
      null,
    revealedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function LiveRoom({
  initialSnapshot,
  demoMode = false,
}: LiveRoomProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [busy, setBusy] = useState(false);
  const [browsingId, setBrowsingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<SessionSnapshot["queue"][number] | null>(null);
  const [conflict, setConflict] = useState<{ action: string; payload: Record<string, unknown>; message: string } | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);
  const [refreshingIssue, setRefreshingIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<
    "connected" | "reconnecting" | "offline"
  >("connected");
  const [copied, setCopied] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [addIssueOpen, setAddIssueOpen] = useState(false);
  const [addIssueQuery, setAddIssueQuery] = useState("");
  const [addIssueResults, setAddIssueResults] = useState<
    LinearIssueSummary[]
  >([]);
  const [addIssueHasSearched, setAddIssueHasSearched] = useState(false);
  const [addIssueSearching, setAddIssueSearching] = useState(false);
  const [addingIssueId, setAddingIssueId] = useState<string | null>(null);
  const [finalEstimate, setFinalEstimate] = useState<{
    queueItemId: string;
    value: number;
  } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<
    | { type: "delete-session" }
    | {
        type: "remove-issue";
        item: SessionSnapshot["queue"][number];
      }
    | null
  >(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() =>
    new Set(
      initialSnapshot.participants
        .filter((person) => person.online)
        .map((person) => person.id),
    ),
  );
  useEffect(() => {
    if (!browsingId || demoMode) return;
    const controller = new AbortController();
    fetch(`/api/sessions/${initialSnapshot.id}/preview?itemId=${encodeURIComponent(browsingId)}`, { signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not refresh preview"); if (!controller.signal.aborted) setPreviewItem(data.item); })
      .catch(error => { if (!controller.signal.aborted) setPreviewNotice(`${error.message}. Showing the saved ticket preview.`); });
    return () => controller.abort();
  }, [browsingId, demoMode, initialSnapshot.id]);

  const refreshInFlight = useRef<Promise<boolean> | null>(null);
  const addIssueDialogRef = useRef<HTMLElement>(null);
  const addIssueReturnFocusRef = useRef<HTMLElement | null>(null);
  const addIssueBusyRef = useRef(false);

  useEffect(() => {
    addIssueBusyRef.current = Boolean(addingIssueId) || addIssueSearching;
  }, [addIssueSearching, addingIssueId]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (demoMode) return true;
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = (async () => {
      try {
        const { data, response } = await requestJson<RoomApiResponse>(
          `/api/sessions/${initialSnapshot.id}/snapshot`,
          { cache: "no-store" },
          8_000,
        );
        if (!response.ok || !data.snapshot) {
          throw new Error(data.error ?? "Could not refresh the room");
        }
        setSnapshot(data.snapshot);
        setSyncState("connected");
        return true;
      } catch {
        setSyncState(navigator.onLine ? "reconnecting" : "offline");
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = request;
    return request;
  }, [demoMode, initialSnapshot.id]);

  useEffect(() => {
    if (demoMode) return;
    const timer = window.setInterval(() => void refresh(), 5_000);
    const recover = () => {
      setSyncState(navigator.onLine ? "reconnecting" : "offline");
      if (navigator.onLine) void refresh();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", recover);
    window.addEventListener("offline", recover);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    let pusher: Pusher | null = null;

    let cancelled = false;
    if (key && cluster) {
      void import("pusher-js").then(({ default: PusherClient }) => {
        if (cancelled) return;
        pusher = new PusherClient(key, {
          cluster,
          channelAuthorization: {
            endpoint: "/api/pusher/auth",
            transport: "ajax",
          },
        });
        pusher.connection.bind("connected", () => void refresh());
        const channel = pusher.subscribe(
          `presence-session-${initialSnapshot.id}`,
        );
        channel.bind("session-changed", () => void refresh());
        channel.bind("pusher:subscription_succeeded", (members: {
          each: (callback: (member: { id: string }) => void) => void;
        }) => {
          const next = new Set<string>();
          members.each((member) => next.add(member.id));
          setOnlineIds(next);
        });
        channel.bind(
          "pusher:member_added",
          (member: { id: string }) =>
            setOnlineIds((current) => new Set(current).add(member.id)),
        );
        channel.bind(
          "pusher:member_removed",
          (member: { id: string }) =>
            setOnlineIds((current) => {
              const next = new Set(current);
              next.delete(member.id);
              return next;
            }),
        );
      });
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("online", recover);
      window.removeEventListener("offline", recover);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      pusher?.unsubscribe(`presence-session-${initialSnapshot.id}`);
      pusher?.disconnect();
    };
  }, [demoMode, initialSnapshot.id, refresh]);

  useEffect(() => {
    if (!addIssueOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !addIssueBusyRef.current) {
        setAddIssueOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = addIssueDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      addIssueReturnFocusRef.current?.focus();
    };
  }, [addIssueOpen]);

  const activeItem = snapshot.queue.find(
    (item) => item.id === snapshot.activeItemId,
  );
  const viewedItem = (browsingId && previewItem?.id === browsingId ? previewItem : snapshot.queue.find(item => item.id === browsingId)) ?? activeItem;
  const issuePaneRef = useRef<HTMLElement>(null);
  const viewedItemId = viewedItem?.id;
  const previousViewedItemId = useRef(viewedItemId);
  useEffect(() => {
    if (previousViewedItemId.current === viewedItemId) return;
    previousViewedItemId.current = viewedItemId;
    // A new ticket must start at its title, including when the facilitator
    // advances from controls below the ticket on a scrolling phone layout.
    const pane = issuePaneRef.current;
    pane?.querySelector(".issue-scroll")?.scrollTo({ top: 0, behavior: "instant" });
    if (window.matchMedia("(max-width: 700px), (max-height: 600px)").matches) {
      pane?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [viewedItemId]);
  const browsing = Boolean(viewedItem && viewedItem.id !== activeItem?.id);
  const me = snapshot.participants.find(
    (person) => person.id === snapshot.currentUserId,
  );
  const isFacilitator = snapshot.currentUserRole === "facilitator";
  const isEligibleVoter =
    Boolean(snapshot.round?.eligibleVoterIds.includes(snapshot.currentUserId));
  const canVote = snapshot.round?.status === "voting" && isEligibleVoter && !browsing;
  const revealed =
    snapshot.round?.status === "revealed" ||
    snapshot.round?.status === "finalized";
  const completed = snapshot.queue.filter(
    (item) =>
      item.groomingOutcome !== null ||
      item.status === "estimated" ||
      item.status === "skipped",
  ).length;
  const attachedFigmaDesigns =
    viewedItem?.attachments?.filter(
      (attachment) =>
        attachment.sourceType?.toLowerCase() === "figma" ||
        isFigmaUrl(attachment.url),
    ) ?? [];
  const describedFigmaDesigns = extractFigmaUrls(
    viewedItem?.description,
  ).map((url, index) => ({
    id: `description-figma-${index}`,
    title: figmaPreviewTitle(url),
    subtitle: "Linked in description",
    url,
    sourceType: "figma",
  }));
  const figmaAttachments = [
    ...attachedFigmaDesigns,
    ...describedFigmaDesigns,
  ].filter(
    (attachment, index, all) =>
      all.findIndex((candidate) => candidate.url === attachment.url) === index,
  );
  const otherAttachments =
    viewedItem?.attachments?.filter(
      (attachment) =>
        !attachedFigmaDesigns.some((item) => item.id === attachment.id),
    ) ?? [];
  const eligibleParticipants =
    snapshot.round?.eligibleVoterIds
      .map((id) =>
        snapshot.participants.find((participant) => participant.id === id),
      )
      .filter((participant) => participant !== undefined) ?? [];
  const submittedVoteCount = eligibleParticipants.filter(
    (participant) => participant.hasVoted,
  ).length;
  const eligibleVoterCount = snapshot.round?.eligibleVoterIds.length ?? 0;
  const revealedVotes = eligibleParticipants
    .map((participant) => participant.vote)
    .filter((vote): vote is number => vote !== null);
  const voteSpread = revealedVotes.length
    ? `${Math.min(...revealedVotes)}–${Math.max(...revealedVotes)}`
    : null;
  const normalizedAddIssueQuery = addIssueQuery.trim().toLowerCase();
  const addQueuedMatch = normalizedAddIssueQuery
    ? snapshot.queue.find(
        (item) =>
          item.identifier.toLowerCase() === normalizedAddIssueQuery ||
          item.title.toLowerCase().includes(normalizedAddIssueQuery),
      )
    : null;
  const averageResult = revealed
    ? roundedUpAverageVote(
        revealedVotes,
        snapshot.estimateCards.map((card) => card.value),
      )
    : null;
  const suggestedFinalEstimate = averageResult?.estimate ?? null;
  const selectedFinalEstimate =
    finalEstimate?.queueItemId === snapshot.activeItemId
      ? finalEstimate.value
      : suggestedFinalEstimate;

  async function vote(value: VoteValue) {
    setError(null);
    if (demoMode) {
      setSnapshot((current) =>
        localVote(current, current.currentUserId, value),
      );
      return;
    }
    setVoteBusy(true);
    setSnapshot((current) =>
      optimisticVote(current, current.currentUserId, value),
    );
    try {
      const { data, response } = await requestJson<RoomApiResponse>(
        `/api/sessions/${snapshot.id}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        },
      );
      if (!response.ok || !data.snapshot) {
        throw new Error(data.error ?? "Could not submit your vote");
      }
      setSnapshot(data.snapshot);
      setSyncState("connected");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not submit your vote",
      );
      await refresh();
    } finally {
      setVoteBusy(false);
    }
  }

  function demoAction(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    setSnapshot((current) => {
      if (action === "reveal") {
        if (!current.round) return current;
        return {
          ...current,
          round: {
            ...current.round,
            status: "revealed",
            revealedAt: new Date().toISOString(),
          },
          participants: current.participants.map((person, index) =>
            current.round?.eligibleVoterIds.includes(person.id)
              ? {
                  ...person,
                  vote: person.vote ?? ([1, 2, 4, 4][index] as number),
                  hasVoted: true,
                }
              : { ...person, vote: null, hasVoted: false },
          ),
        };
      }
      if (action === "revote") {
        if (!current.round) return current;
        return {
          ...current,
          round: {
            ...current.round,
            number: current.round.number + 1,
            status: "voting",
            revealedAt: null,
          },
          participants: current.participants.map((person) => ({
            ...person,
            vote: null,
            hasVoted: false,
            signal: null,
          })),
        };
      }
      if (action === "activate") {
        const queueItemId = String(payload.queueItemId);
        const round = localRound(current, queueItemId);
        const activatedAt = new Date().toISOString();
        return {
          ...current,
          status: "live",
          endedAt: null,
          activeStartedAt: current.activeStartedAt ?? activatedAt,
          activeItemId: queueItemId,
          queue: current.queue.map((item) => ({
            ...item,
            status:
              item.id === queueItemId
                ? "active"
                : item.status === "active"
                  ? "pending"
                  : item.status,
            activeStartedAt:
              item.id === queueItemId
                ? activatedAt
                : item.status === "active"
                  ? null
                  : item.activeStartedAt,
            elapsedSeconds:
              item.status === "active" && item.id !== queueItemId
                ? accumulatedElapsedSeconds(
                    item.elapsedSeconds,
                    item.activeStartedAt,
                  )
                : item.elapsedSeconds,
            finalEstimate: item.id === queueItemId ? null : item.finalEstimate,
            groomingOutcome: item.id === queueItemId ? null : item.groomingOutcome,
            groomingNote: item.id === queueItemId ? null : item.groomingNote,
            decidedAt: item.id === queueItemId ? null : item.decidedAt,
          })),
          round,
          participants: current.participants.map((person) => ({
            ...person,
            vote: null,
            hasVoted: false,
            signal: null,
          })),
        };
      }
      if (action === "participant-role") {
        const votingEnabled = Boolean(payload.votingEnabled);
        const participantUserId = String(payload.participantUserId);
        const eligibleVoterIds = current.round
          ? votingEnabled
            ? [...new Set([...current.round.eligibleVoterIds, participantUserId])]
            : current.round.eligibleVoterIds.filter(
                (userId) => userId !== participantUserId,
              )
          : [];
        return {
          ...current,
          participants: current.participants.map((person) =>
            person.id === participantUserId
              ? {
                  ...person,
                  role: payload.role as ParticipantRole,
                  votingEnabled,
                  hasVoted: votingEnabled ? person.hasVoted : false,
                  vote: votingEnabled ? person.vote : null,
                }
              : person,
          ),
          round: current.round
            ? { ...current.round, eligibleVoterIds }
            : null,
        };
      }
      if (action === "finalize") {
        const currentActive = current.queue.find(
          (item) => item.id === current.activeItemId,
        );
        const next = current.queue.find(
          (item) =>
            item.position > (currentActive?.position ?? -1) &&
            item.status === "pending",
        );
        const decidedAt = new Date().toISOString();
        const sessionElapsed = accumulatedElapsedSeconds(
          current.elapsedSeconds,
          current.activeStartedAt,
        );
        return {
          ...current,
          status: next ? "live" : "ended",
          endedAt: next ? null : decidedAt,
          activeStartedAt: next ? current.activeStartedAt : null,
          elapsedSeconds: next ? current.elapsedSeconds : sessionElapsed,
          activeItemId: next?.id ?? null,
          queue: current.queue.map((item) => ({
            ...item,
            status:
              item.id === current.activeItemId
                ? "estimated"
                : item.id === next?.id
                  ? "active"
                  : item.status,
            finalEstimate:
              item.id === current.activeItemId
                ? Number(payload.estimate)
                : item.finalEstimate,
            groomingOutcome:
              item.id === current.activeItemId ? "ready" : item.groomingOutcome,
            groomingNote: item.id === current.activeItemId ? null : item.groomingNote,
            decidedAt:
              item.id === current.activeItemId
                ? decidedAt
                : item.decidedAt,
            activeStartedAt:
              item.id === current.activeItemId
                ? null
                : item.id === next?.id
                  ? decidedAt
                  : item.activeStartedAt,
            elapsedSeconds:
              item.id === current.activeItemId
                ? accumulatedElapsedSeconds(
                    item.elapsedSeconds,
                    item.activeStartedAt,
                  )
                : item.elapsedSeconds,
          })),
          round: next ? localRound(current, next.id) : null,
          participants: current.participants.map((person) => ({
            ...person,
            vote: null,
            hasVoted: false,
            signal: null,
          })),
        };
      }
      if (action === "skip") {
        const currentActive = current.queue.find(
          (item) => item.id === current.activeItemId,
        );
        const next = current.queue.find(
          (item) =>
            item.position > (currentActive?.position ?? -1) &&
            item.status === "pending",
        );
        const decidedAt = new Date().toISOString();
        const sessionElapsed = accumulatedElapsedSeconds(
          current.elapsedSeconds,
          current.activeStartedAt,
        );
        return {
          ...current,
          status: next ? "live" : "ended",
          endedAt: next ? null : decidedAt,
          activeStartedAt: next ? current.activeStartedAt : null,
          elapsedSeconds: next ? current.elapsedSeconds : sessionElapsed,
          activeItemId: next?.id ?? null,
          queue: current.queue.map((item) => ({
            ...item,
            status:
              item.id === current.activeItemId
                ? "skipped"
                : item.id === next?.id
                  ? "active"
                  : item.status,
            groomingOutcome:
              item.id === current.activeItemId
                ? "skipped"
                : item.groomingOutcome,
            groomingNote: item.id === current.activeItemId ? null : item.groomingNote,
            decidedAt:
              item.id === current.activeItemId
                ? decidedAt
                : item.decidedAt,
            activeStartedAt:
              item.id === current.activeItemId
                ? null
                : item.id === next?.id
                  ? decidedAt
                  : item.activeStartedAt,
            elapsedSeconds:
              item.id === current.activeItemId
                ? accumulatedElapsedSeconds(
                    item.elapsedSeconds,
                    item.activeStartedAt,
                  )
                : item.elapsedSeconds,
          })),
          round: next ? localRound(current, next.id) : null,
          participants: current.participants.map((person) => ({
            ...person,
            vote: null,
            hasVoted: false,
            signal: null,
          })),
        };
      }
      if (action === "finish") {
        const finishedAt = new Date().toISOString();
        return {
          ...current,
          status: "ended",
          endedAt: finishedAt,
          activeStartedAt: null,
          elapsedSeconds: accumulatedElapsedSeconds(
            current.elapsedSeconds,
            current.activeStartedAt,
          ),
          activeItemId: null,
          queue: current.queue.map((item) => ({
            ...item,
            status: item.status === "active" ? "pending" : item.status,
            activeStartedAt: item.status === "active" ? null : item.activeStartedAt,
            elapsedSeconds:
              item.status === "active"
                ? accumulatedElapsedSeconds(
                    item.elapsedSeconds,
                    item.activeStartedAt,
                  )
                : item.elapsedSeconds,
          })),
          round: null,
        };
      }
      return current;
    });
  }

  async function action(
    actionName: string,
    payload: Record<string, unknown> = {},
    overwrite = false,
  ) {
    setError(null);
    setBrowsingId(null);
    if (demoMode) {
      demoAction(actionName, payload);
      if (["activate", "finalize", "skip", "finish"].includes(actionName)) {
        setFinalEstimate(null);
      }
      return;
    }
    setBusy(true);
    try {
      const shouldOverwrite = overwrite;
      while (true) {
        const { data, response } = await requestJson<RoomApiResponse>(
          `/api/sessions/${snapshot.id}/actions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: actionName,
              ...payload,
              ...(shouldOverwrite ? { overwrite: true } : {}),
            }),
          },
        );
        if (response.status === 409 && !shouldOverwrite) {
          setConflict({ action: actionName, payload, message: data.error ?? "This estimate changed in Linear." });
          return;
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Could not update the session");
        }
        if (data.snapshot) {
          if (data.snapshot.activeItemId !== snapshot.activeItemId) {
            setFinalEstimate(null);
          }
          setSnapshot(data.snapshot);
          if (actionName === "finalize") setPreviewNotice(`${activeItem?.identifier ?? "Estimate"} saved to Linear.`);
          setSyncState("connected");
        } else {
          await refresh();
        }
        break;
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not update the session",
      );
    } finally {
      setBusy(false);
    }
  }

  async function refreshLinearPreview() {
    if (demoMode) {
      setPreviewNotice("Demo ticket preview refreshed.");
      window.setTimeout(() => setPreviewNotice(null), 2200);
      return;
    }
    setRefreshingIssue(true);
    setError(null);
    setPreviewNotice(null);
    try {
      const { data, response } = await requestJson<RoomApiResponse>(
        `/api/sessions/${snapshot.id}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "refresh-issue" }),
        },
      );
      if (!response.ok || !data.snapshot) {
        throw new Error(data.error ?? "Could not refresh from Linear");
      }
      setSnapshot(data.snapshot);
      setSyncState("connected");
      setPreviewNotice("Ticket preview refreshed from Linear.");
      window.setTimeout(() => setPreviewNotice(null), 2200);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not refresh from Linear",
      );
    } finally {
      setRefreshingIssue(false);
    }
  }

  async function copyInvite() {
    const url = demoMode
      ? `${window.location.origin}/demo`
      : `${window.location.origin}/s/${snapshot.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(`Could not copy automatically. Select and copy this link: ${url}`);
    }
  }

  async function deleteSession() {
    if (demoMode) return;
    setBusy(true);
    setError(null);
    try {
      const { data, response } = await requestJson<{ error?: string }>(
        `/api/sessions/${snapshot.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete this session");
      }
      setConfirmTarget(null);
      router.push("/app");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not delete this session",
      );
    } finally {
      setBusy(false);
    }
  }

  async function searchAdditionalIssues(searchQuery = addIssueQuery) {
    setAddIssueHasSearched(true);
    setAddIssueSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        teamId: snapshot.teamId,
        cycleScope: "any",
        ...(snapshot.intake?.cycleId ? { cycleId: snapshot.intake.cycleId } : {}),
        ...(snapshot.intake?.cycleOffset === "backlog" ? { noCycle: "true" } : {}),
        stateTypes: "backlog,unstarted,started,triage",
        estimateScope: "unestimated",
        assigneeScope: "anyone",
        ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
      });
      const response = await fetch(`/api/linear/issues?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const queuedIds = new Set(
        snapshot.queue.map((item) => item.linearIssueId),
      );
      setAddIssueResults(
        (data.issues as LinearIssueSummary[]).filter(
          (issue) => !queuedIds.has(issue.id),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load Linear tickets",
      );
    } finally {
      setAddIssueSearching(false);
    }
  }

  function openAddIssue() {
    addIssueReturnFocusRef.current = document.activeElement as HTMLElement | null;
    setAddIssueQuery("");
    setAddIssueResults([]);
    setAddIssueHasSearched(false);
    setAddIssueOpen(true);
  }

  async function addIssue(issue: LinearIssueSummary) {
    setAddingIssueId(issue.id);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${snapshot.id}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueIds: [issue.id],

        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAddIssueOpen(false);
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add the ticket",
      );
    } finally {
      setAddingIssueId(null);
    }
  }

  async function removeIssue(item: SessionSnapshot["queue"][number]) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/${snapshot.id}/queue?itemId=${item.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      await refresh();
      setConfirmTarget(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not remove the ticket",
      );
    } finally {
      setBusy(false);
    }
  }

  const handleRoomShortcut = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      document.querySelector('[role="dialog"][aria-modal="true"]') ||
      target?.closest("input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    if (event.key === "Escape" && shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (addIssueOpen) return;
    if (event.key === "?") {
      event.preventDefault();
      setShortcutsOpen((current) => !current);
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "c") {
      event.preventDefault();
      void copyInvite();
      return;
    }
    if (canVote && !voteBusy && /^[1-9]$/.test(key)) {
      const card = snapshot.estimateCards[Number(key) - 1];
      if (card) {
        event.preventDefault();
        void vote(card.value);
      }
      return;
    }
    if (isFacilitator && key === "r" && !revealed && !busy) {
      event.preventDefault();
      void action("reveal");
      return;
    }
    if (
      isFacilitator &&
      key === "n" &&
      revealed &&
      selectedFinalEstimate !== null &&
      !busy
    ) {
      event.preventDefault();
      void action("finalize", {
        estimate: selectedFinalEstimate,
      });
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleRoomShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <main
      className={`room-shell ${
        isFacilitator ? "facilitator-view" : "participant-view"
      }`}
    >
      <header className="room-header">
        <div className="room-title">
          <Brand compact />
          <Link aria-label="Back to sessions" href="/app">
            <ArrowLeft size={15} />
          </Link>
          <div>
            <b>{snapshot.title}</b>
            <span>
              <i className="live-dot" />
              {demoMode ? "Demo session" : snapshot.status === "live" ? "Live session" : snapshot.status}
            </span>
          </div>
        </div>
        <div className="room-progress">
          <span>
            {snapshot.queue.filter(item => item.status === "estimated").length} estimated · {snapshot.queue.filter(item => item.status === "skipped").length} skipped · {snapshot.queue.length - completed} remaining
          </span>
          <div>
            <i
              style={{
                width: `${snapshot.queue.length ? (completed / snapshot.queue.length) * 100 : 0}%`,
              }}
            />
          </div>
          <ElapsedTimer
            activeStartedAt={snapshot.activeStartedAt}
            baseSeconds={snapshot.elapsedSeconds}
            label="Total"
          />
        </div>
        <div className="room-actions">
          <FeedbackButton compact />
          <button
            aria-expanded={shortcutsOpen}
            aria-label="Keyboard shortcuts"
            className="shortcut-help-button"
            onClick={() => setShortcutsOpen((current) => !current)}
            title="Keyboard shortcuts (?)"
            type="button"
          >
            <Keyboard size={16} />
          </button>
          {isFacilitator && snapshot.status === "live" && !demoMode && (
            <button
              aria-label="Add ticket"
              className="mobile-add-ticket-button"
              onClick={openAddIssue}
              title="Add ticket"
              type="button"
            >
              <CirclePlus size={16} />
            </button>
          )}
          <button
            className="copy-invite-button"
            onClick={copyInvite}
            type="button"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {isFacilitator && !demoMode && <SlackInviteButton sessionId={snapshot.id} title={snapshot.title} teamName={snapshot.teamName} issueCount={snapshot.queue.length} code={snapshot.code} />}
          {isFacilitator && snapshot.status === "live" && (
            <button
              aria-label="Finish for now"
              title="Finish for now"
              className="finish-session-button"
              disabled={busy}
              onClick={() => void action("finish")}
              type="button"
            >
              <PauseCircle size={15} /> <span>Finish for now</span>
            </button>
          )}
          {isFacilitator && !demoMode && (
            <button
              aria-label="Delete session"
              className="icon-button"
              disabled={busy}
              onClick={() => setConfirmTarget({ type: "delete-session" })}
              title="Delete session"
              type="button"
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
        {shortcutsOpen && (
          <section
            aria-label="Keyboard shortcuts"
            className="shortcut-panel"
            role="dialog"
          >
            <div><b>Keyboard shortcuts</b><button aria-label="Close shortcuts" onClick={() => setShortcutsOpen(false)} type="button"><X size={14} /></button></div>
            <dl>
              {canVote && <><dt>1–9</dt><dd>Choose a pointing card</dd></>}
              {isFacilitator && !revealed && <><dt>R</dt><dd>Reveal this round</dd></>}
              {isFacilitator && revealed && <><dt>N</dt><dd>Apply estimate and advance</dd></>}
              <dt>C</dt><dd>Copy invite link</dd>
              <dt>?</dt><dd>Open or close this help</dd>
            </dl>
          </section>
        )}
      </header>

      {demoMode && (
        <div className="demo-notice" role="note">
          <span>Demo · Nothing is saved to Linear.</span>
          <nav aria-label="Demo role"><Link aria-current={isFacilitator ? "page" : undefined} href="/demo">Facilitator</Link><Link aria-current={!isFacilitator ? "page" : undefined} href="/demo?role=voter">Participant</Link></nav>
        </div>
      )}
      {error && <div className="room-error" role="alert">{error}</div>}
      {previewNotice && <div className="room-notice">{previewNotice}</div>}
      {syncState !== "connected" && (
        <div className="room-sync-status" role="status">
          <LoaderCircle className={syncState === "reconnecting" ? "spin" : ""} size={14} />
          <span>
            {syncState === "offline"
              ? "You’re offline. The room will catch up automatically."
              : "Reconnecting to the room…"}
          </span>
          <button onClick={() => void refresh()} type="button">
            Retry now
          </button>
        </div>
      )}

      {addIssueOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !addIssueSearching &&
              !addingIssueId
            ) {
              setAddIssueOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="add-issue-title"
            aria-modal="true"
            className="issue-picker-modal"
            ref={addIssueDialogRef}
            role="dialog"
          >
            <div className="issue-picker-heading">
              <div>
                <h2 id="add-issue-title">Add a Linear ticket</h2>
                <p>Unpointed tickets will be added to the end of the agenda.</p>
              </div>
              <button
                aria-label="Close"
                className="icon-button"
                disabled={Boolean(addingIssueId)}
                onClick={() => setAddIssueOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>
            <div className="issue-picker-search">
              <Search size={17} />
              <input
                autoFocus
                onChange={(event) => setAddIssueQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void searchAdditionalIssues();
                  }
                }}
                placeholder="Search title or KEY-123…"
                value={addIssueQuery}
              />
              <button
                disabled={addIssueSearching}
                onClick={() => void searchAdditionalIssues()}
                type="button"
              >
                {addIssueSearching
                  ? "Searching…"
                  : addIssueQuery.trim()
                    ? "Search"
                    : "Show recent"}
              </button>
            </div>
            {error && <div className="form-error issue-picker-error">{error}</div>}
            <div className="issue-picker-results">
              {addIssueSearching && addIssueResults.length === 0 ? (
                <div className="issue-picker-empty">
                  <span className="loading-ring" />
                  <b>Searching Linear…</b>
                </div>
              ) : addIssueResults.length === 0 ? (
                <div className="issue-picker-empty">
                  {addQueuedMatch ? <Check size={20} /> : <Search size={20} />}
                  <b>
                    {addQueuedMatch
                      ? "Already in the agenda"
                      : addIssueHasSearched
                        ? "No matching tickets"
                        : "Find one ticket to add"}
                  </b>
                  <p>
                    {addQueuedMatch
                      ? `${addQueuedMatch.identifier} is already part of this session.`
                      : addIssueHasSearched
                        ? "Try another title or ticket ID."
                        : "Search by title or ticket ID using your saved ticket filters."}
                  </p>
                </div>
              ) : (
                addIssueResults.map((issue) => (
                  <button
                    disabled={Boolean(addingIssueId)}
                    key={issue.id}
                    onClick={() => void addIssue(issue)}
                    type="button"
                  >
                    <span>
                      <b>{issue.title}</b>
                      <small>
                        {issue.identifier} ·{" "}
                        {issue.priorityLabel ?? "No priority"}
                      </small>
                    </span>
                    <em>
                      {addingIssueId === issue.id ? "Adding…" : "Add"}
                    </em>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        busy={busy}
        confirmLabel={
          confirmTarget?.type === "delete-session"
            ? "Delete session"
            : "Remove ticket"
        }
        description={
          confirmTarget?.type === "delete-session"
            ? `Delete “${snapshot.title}” and its vote history?`
            : confirmTarget?.type === "remove-issue"
              ? `Remove ${confirmTarget.item.identifier} from this session?`
              : ""
        }
        detail={
          confirmTarget?.type === "delete-session"
            ? "This cannot be undone. Linear tickets and estimates will not be changed."
            : "The ticket and its estimate will stay unchanged in Linear."
        }
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget?.type === "delete-session") {
            void deleteSession();
          } else if (confirmTarget?.type === "remove-issue") {
            void removeIssue(confirmTarget.item);
          }
        }}
        open={confirmTarget !== null}
        title={
          confirmTarget?.type === "delete-session"
            ? "Delete this pointing session?"
            : "Remove this ticket?"
        }
      />

      <ConfirmDialog open={Boolean(conflict)} variant="primary" title="Estimate changed in Linear" description={conflict?.message ?? ""} detail="Review the change before replacing the existing estimate." confirmLabel="Save my estimate" onCancel={() => setConflict(null)} onConfirm={() => { if (conflict) { const next = conflict; setConflict(null); void action(next.action, next.payload, true); } }} />
      <div className="mobile-agenda-nav"><label>{isFacilitator ? "Go to ticket" : "Browse agenda"}<select disabled={busy} value={viewedItem?.id ?? ""} onChange={event => { if (isFacilitator) void action("activate", { queueItemId: event.target.value }); else setBrowsingId(event.target.value); }}><option value="" disabled>Choose a ticket</option>{snapshot.queue.map(item => <option key={item.id} value={item.id}>{item.identifier} · {item.title} · {item.status === "active" ? "Current" : item.status}</option>)}</select></label></div>
      <section className="room-grid">
        <aside className="room-queue">
          <div className="pane-heading">
            <span>AGENDA</span>
            <div className="agenda-heading-actions">
              <b>{snapshot.queue.length}</b>
              {isFacilitator &&
                snapshot.status === "live" &&
                !demoMode && (
                  <button onClick={openAddIssue} type="button">
                    <CirclePlus size={14} /> Add
                  </button>
                )}
            </div>
          </div>
          <div className="room-queue-list">
            {snapshot.queue.map((item, index) => {
              const canRemove =
                isFacilitator &&
                !demoMode &&
                item.status === "pending";
              return (
                <div className="room-ticket-row" key={item.id}>
                  <button
                    className={`room-ticket ${item.id === snapshot.activeItemId ? "active" : ""} ${item.status}`}
                    disabled={busy}
                    onClick={() =>
                      isFacilitator ? void action("activate", { queueItemId: item.id }) : setBrowsingId(item.id)
                    }
                    type="button"
                  >
                    <span className="ticket-index">
                      {item.status === "skipped" ? (
                        <SkipForward size={15} />
                      ) : item.status === "estimated" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <b>{item.title}</b>
                      <small>
                        {item.identifier}
                        {item.finalEstimate !== null
                          ? ` · ${voteLabel(item.finalEstimate, snapshot.estimateCards)}`
                          : ""}
                        {item.groomingOutcome && item.groomingOutcome !== "ready"
                          ? ` · ${groomingOutcomeLabel(item.groomingOutcome)}`
                          : ""}
                        {(item.elapsedSeconds > 0 || item.activeStartedAt) && (
                          <>
                            {" · "}
                            <ElapsedTimer
                              activeStartedAt={item.activeStartedAt}
                              baseSeconds={item.elapsedSeconds}
                              compact
                            />
                          </>
                        )}
                      </small>
                    </div>
                    {item.id === snapshot.activeItemId && (
                      <CircleDot size={15} />
                    )}
                  </button>
                  {canRemove && (
                    <button
                      aria-label={`Remove ${item.identifier} from session`}
                      className="room-ticket-remove"
                      disabled={busy}
                      onClick={() =>
                        setConfirmTarget({ type: "remove-issue", item })
                      }
                      title="Remove from session"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="queue-footer">
            <span>{snapshot.teamName}</span>
            <small>
              {snapshot.estimateCards.map((card) => card.label).join(" · ")}
            </small>
          </div>
        </aside>

        <section className="room-issue" ref={issuePaneRef}>
          {browsing && <div className="browse-notice" role="status"><span>Previewing {viewedItem?.identifier}. The team is on {activeItem?.identifier ?? "the summary"}.</span><button type="button" onClick={() => setBrowsingId(null)}>Return to current ticket</button></div>}
          {viewedItem ? (
            <>
              <div className="issue-scroll">
                <div className="issue-meta-row">
                  <span>{viewedItem.identifier}</span>
                  <i />
                  <span>{viewedItem.priorityLabel ?? "No priority"}</span>
                  <i />
                  <span>{viewedItem.stateName ?? "No status"}</span>
                  <div className="issue-source-actions">
                    <button
                      aria-label="Refresh ticket preview from Linear"
                      disabled={refreshingIssue || browsing}
                      onClick={() => void refreshLinearPreview()}
                      title="Refresh title, description, project, designs, and metadata from Linear"
                      type="button"
                    >
                      <RefreshCw
                        className={refreshingIssue ? "spin" : ""}
                        size={13}
                      />
                      {refreshingIssue ? "Refreshing…" : "Refresh"}
                    </button>
                    <a href={viewedItem.url} target="_blank" rel="noreferrer">
                      Open in Linear <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
                <h1>{viewedItem.title}</h1>
                <div className="issue-tags">
                  {viewedItem.projectName && (
                    <span className="issue-project-tag">
                      Project · {viewedItem.projectName}
                    </span>
                  )}
                  {viewedItem.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                  {viewedItem.assigneeName && (
                    <span>Owner · {viewedItem.assigneeName}</span>
                  )}
                </div>
                {figmaAttachments.length > 0 && (
                  <section className="figma-designs">
                    <div className="section-label">Figma</div>
                    {figmaAttachments.map((attachment) => (
                      <div className="figma-design" key={attachment.id}>
                        <div>
                          <b>{attachment.title}</b>
                          <a href={attachment.url} rel="noreferrer" target="_blank">
                            Open in Figma <ExternalLink size={12} />
                          </a>
                        </div>
                        <iframe
                          allowFullScreen
                          loading="lazy"
                          src={figmaEmbedUrl(attachment.url)}
                          title={attachment.title}
                        />
                      </div>
                    ))}
                  </section>
                )}
                {otherAttachments.length > 0 && (
                  <section className="issue-attachments">
                    <div className="section-label">Attachments</div>
                    {otherAttachments.map((attachment) => (
                      <a
                        href={attachment.url}
                        key={attachment.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {attachment.title} <ExternalLink size={12} />
                      </a>
                    ))}
                  </section>
                )}
                <div className="issue-description">
                  {viewedItem.description ? (
                    <ReactMarkdown
                      components={{
                        a: ({ children, ...props }) => (
                          <a {...props} rel="noreferrer" target="_blank">
                            {children}
                          </a>
                        ),
                        img: ({ alt, src }) => {
                          const proxied = proxiedLinearMediaUrl(
                            typeof src === "string" ? src : undefined,
                          );
                          return proxied ? (
                            <img
                              alt={alt ?? ""}
                              loading="lazy"
                              src={proxied}
                            />
                          ) : null;
                        },
                      }}
                      rehypePlugins={[rehypeSanitize]}
                      remarkPlugins={[remarkGfm]}
                    >
                      {viewedItem.description}
                    </ReactMarkdown>
                  ) : (
                    <p className="empty-description">
                      No description yet. Open the ticket in Linear to add
                      context.
                    </p>
                  )}
                </div>
                {(viewedItem.subIssues?.length ?? 0) > 0 && (
                  <section className="sub-issues">
                    <h3>Sub-issues</h3>
                    {viewedItem.subIssues.map((subIssue) => (
                      <div key={subIssue.id}>
                        <span>{subIssue.identifier}</span>
                        <b>{subIssue.title}</b>
                        <small>{subIssue.stateName ?? "No status"}</small>
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <div className="vote-dock">
                <div className="vote-dock-head">
                  <div>
                    {revealed ? <Eye size={15} /> : <EyeOff size={15} />}
                    <b>
                      {revealed
                        ? "Votes revealed"
                        : canVote
                          ? me?.hasVoted
                            ? "Vote submitted — tap to change"
                            : "Choose when you’re ready"
                          : "Watching this round"}
                    </b>
                  </div>
                  <span>
                    {eligibleVoterCount === 0
                      ? `Round ${snapshot.round?.number ?? "—"} · No voters yet`
                      : `Round ${snapshot.round?.number ?? "—"} · ${submittedVoteCount}/${eligibleVoterCount} voted`}
                    {activeItem && (
                      <ElapsedTimer
                        activeStartedAt={activeItem.activeStartedAt}
                        baseSeconds={activeItem.elapsedSeconds}
                        label="Issue"
                      />
                    )}
                  </span>
                </div>
                {revealed && <div className="mobile-revealed-votes" aria-label="Revealed votes">{eligibleParticipants.map(person => <span key={person.id}><b>{person.name.split(" ")[0]}</b><strong>{person.vote === null ? "No vote" : voteLabel(person.vote, snapshot.estimateCards)}</strong></span>)}</div>}
                {isEligibleVoter ? (
                  <div className="voter-controls">
                    <div className="vote-cards">
                      {snapshot.estimateCards.map((card, index) => (
                        <button
                          className={
                            me?.hasVoted && me.vote === card.value
                              ? "selected"
                              : ""
                          }
                          aria-label={`${card.label} points${index < 9 ? `, shortcut ${index + 1}` : ""}`}
                          aria-pressed={me?.hasVoted && me.vote === card.value}
                          disabled={!canVote || voteBusy}
                          key={card.value}
                          onClick={() => void vote(card.value)}
                          type="button"
                        >
                          <span>{card.label}</span>
                          {index < 9 && <kbd aria-hidden="true">{index + 1}</kbd>}
                        </button>
                      ))}
                    </div>
                    {demoMode && !isFacilitator && !revealed && <button className="text-action" disabled={!me?.hasVoted || browsing} onClick={() => demoAction("reveal", {})} type="button">Show team votes</button>}
                  </div>
                ) : isFacilitator ? (
                  <div
                    className={`facilitator-wait ${eligibleVoterCount === 0 ? "no-voters" : ""}`}
                  >
                    <Users size={18} />
                    <div>
                      <b>
                        {eligibleVoterCount === 0
                          ? "No voters in this round yet."
                          : "You facilitate; the team points."}
                      </b>
                      <span>
                        {revealed
                          ? "Review the suggested result and set the final estimate."
                          : eligibleVoterCount === 0
                            ? "Invite teammates, or set the estimate yourself when discussion is done."
                          : snapshot.autoReveal === false ? "Reveal the votes when the team is ready." : "Votes reveal automatically when everyone has voted."}
                      </span>
                    </div>
                    {eligibleVoterCount === 0 && !revealed && (
                      <button onClick={copyInvite} type="button">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy invite"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="facilitator-wait observer-wait">
                    <Eye size={18} />
                    <div>
                      <b>You’re observing this round.</b>
                      <span>You’ll be included when the next round starts.</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : snapshot.status === "draft" ? (
            <WaitingRoom
              isFacilitator={isFacilitator}
              participantCount={snapshot.participants.length}
              participants={snapshot.participants}
              prepareHref={`/app/sessions/${snapshot.id}/prepare`}
              ticketCount={snapshot.queue.length}
              title={snapshot.title}
            />
          ) : (
            <SessionSummary
              busy={busy}
              demoMode={demoMode}
              cards={snapshot.estimateCards}
              isFacilitator={isFacilitator}
              items={snapshot.queue}
              onResume={(queueItemId) => void action("activate", { queueItemId })}
              sessionActiveStartedAt={snapshot.activeStartedAt}
              sessionElapsedSeconds={snapshot.elapsedSeconds}
              title={snapshot.title}
            />
          )}
        </section>

        <aside className="room-team">
          <div className="pane-heading">
            <span>ROOM</span>
            <b>
              <Users size={13} /> {snapshot.participants.length}
            </b>
          </div>
          <div className="participant-list">
            {snapshot.participants.map((person) => (
              <Participant
                cards={snapshot.estimateCards}
                isFacilitator={isFacilitator}
                key={person.id}
                onRole={(role, votingEnabled) =>
                  void action("participant-role", {
                    participantUserId: person.id,
                    role,
                    votingEnabled,
                    addToCurrentRound: votingEnabled,
                  })
                }
                online={demoMode || onlineIds.has(person.id)}
                person={person}
                revealed={revealed}
              />
            ))}
          </div>

          {isFacilitator && activeItem && (
            <div className="facilitator-controls">
              {revealed ? (
                <>
                  {revealedVotes.length > 1 && new Set(revealedVotes).size > 1 && <p className="vote-disagreement">Votes range from {voteSpread}. Discuss the difference before choosing.</p>}
                  <div className="result-label">
                    <span>FINAL ESTIMATE</span>
                    <small>
                      {finalEstimate?.queueItemId === activeItem.id
                        ? "Your selection"
                        : suggestedFinalEstimate === null
                          ? "Choose after discussion"
                          : `Average ${formatAverage(averageResult?.average)} → ${voteLabel(
                              suggestedFinalEstimate,
                              snapshot.estimateCards,
                            )}`}
                      {voteSpread && ` · votes ${voteSpread}`}
                    </small>
                  </div>
                  <div className="final-values">
                    {snapshot.estimateCards.map((card) => (
                      <button
                        aria-pressed={selectedFinalEstimate === card.value}
                        className={
                          selectedFinalEstimate === card.value ? "selected" : ""
                        }
                        key={card.value}
                        onClick={() =>
                          setFinalEstimate({
                            queueItemId: activeItem.id,
                            value: card.value,
                          })
                        }
                        type="button"
                      >
                        {card.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="button button-dark reveal-button"
                    disabled={busy}
                    onClick={() => void action("reveal")}
                    type="button"
                  >
                    <Eye size={15} />
                    {eligibleVoterCount === 0
                      ? "Set estimate without votes"
                      : "Reveal early"}
                  </button>
                </>
              )}
              {revealed && (
                <>
                  <button
                    className="button button-primary finalize-button"
                    disabled={selectedFinalEstimate === null || busy}
                    onClick={() =>
                      void action("finalize", {
                        estimate: selectedFinalEstimate,
                      })
                    }
                    type="button"
                  >
                    Save estimate &amp; next <Check size={15} />
                  </button>
                  <button
                    className="text-action"
                    disabled={busy}
                    onClick={() => void action("revote")}
                    type="button"
                  >
                    <RotateCcw size={14} /> Start another round
                  </button>
                </>
              )}
              <button
                className="text-action skip-ticket-action"
                disabled={busy}
                onClick={() => void action("skip")}
                type="button"
              >
                <SkipForward size={14} /> Skip
              </button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function WaitingRoom({
  isFacilitator,
  participantCount,
  participants,
  prepareHref,
  ticketCount,
  title,
}: {
  isFacilitator: boolean;
  participantCount: number;
  participants: SessionParticipant[];
  prepareHref: string;
  ticketCount: number;
  title: string;
}) {
  return (
    <div className="waiting-room">
      <span><PointedMark size={30} /></span>
      <p className="step-label">WAITING ROOM</p>
      <h1>{title}</h1>
      <p>
        {participantCount} {participantCount === 1 ? "person is" : "people are"}{" "}
        here · {ticketCount} {ticketCount === 1 ? "ticket" : "tickets"} queued
      </p>
      <div className="waiting-participants" aria-label="Joined participants">
        {participants.map((person) => (
          <span key={person.id} title={person.name}>
            {initials(person.name)}
          </span>
        ))}
      </div>
      {isFacilitator ? (
        <>
          <p>Return to preparation when the team is loaded, then start the first ticket.</p>
          <Link className="button button-primary" href={prepareHref}>
            Review agenda and start <SkipForward size={16} />
          </Link>
        </>
      ) : (
        <p>Keep this tab open. The first ticket will appear automatically.</p>
      )}
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatAverage(average: number | undefined) {
  if (average === undefined) return "—";
  return Number.isInteger(average) ? `${average}` : average.toFixed(1);
}

function ElapsedTimer({
  activeStartedAt,
  baseSeconds,
  compact = false,
  label,
}: {
  activeStartedAt: string | null;
  baseSeconds: number;
  compact?: boolean;
  label?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!activeStartedAt) return;
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [activeStartedAt]);
  const activeSeconds =
    now !== null && activeStartedAt
      ? Math.max(0, Math.floor((now - Date.parse(activeStartedAt)) / 1000))
      : 0;
  return (
    <span className={compact ? "elapsed-timer compact" : "elapsed-timer"}>
      {label && `${label} `}
      {formatDuration(baseSeconds + activeSeconds)}
    </span>
  );
}

function groomingOutcomeLabel(outcome: GroomingOutcome | null) {
  switch (outcome) {
    case "ready":
      return "Estimated";
    case "skipped":
      return "Skipped";
    default:
      return "Not discussed";
  }
}

function SessionSummary({
  busy,
  demoMode,
  items,
  cards,
  title,
  isFacilitator,
  onResume,
  sessionActiveStartedAt,
  sessionElapsedSeconds,
}: {
  busy: boolean;
  demoMode: boolean;
  items: SessionSnapshot["queue"];
  cards: SessionSnapshot["estimateCards"];
  title: string;
  isFacilitator: boolean;
  onResume: (queueItemId: string) => void;
  sessionActiveStartedAt: string | null;
  sessionElapsedSeconds: number;
}) {
  const [copied, setCopied] = useState(false);
  const remaining = items.filter(
    (item) => item.status === "pending" || item.status === "active",
  );
  const [copyFailed, setCopyFailed] = useState(false);
  const summaryText = [
    title,
    `Total time: ${formatDuration(
      accumulatedElapsedSeconds(
        sessionElapsedSeconds,
        sessionActiveStartedAt,
      ),
    )}`,
    "",
    ...items.map((item) => {
      const outcome =
        item.groomingOutcome ??
        (item.status === "estimated"
          ? "ready"
          : item.status === "skipped"
            ? "skipped"
            : null);
      const estimate =
        item.finalEstimate === null ? "" : ` · ${voteLabel(item.finalEstimate, cards)}`;
      const duration = item.elapsedSeconds
        ? ` · ${formatDuration(item.elapsedSeconds)}`
        : "";
      return `${item.identifier}: ${groomingOutcomeLabel(outcome)}${estimate}${duration}`;
    }),
  ].join("\n");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="session-summary">
      <div className="session-summary-heading">
        <span><Check size={22} /></span>
        <div>
          <p className="step-label">GROOMING SUMMARY</p>
          <h1>{remaining.length ? "Finished for now." : "That’s the queue."}</h1>
          <p>
            {items.filter((item) => item.groomingOutcome === "ready" || item.status === "estimated").length} estimated ·{" "}
            {items.filter(item => item.status === "skipped").length} skipped ·{" "}
            {remaining.length} remaining ·{" "}
            <ElapsedTimer
              activeStartedAt={sessionActiveStartedAt}
              baseSeconds={sessionElapsedSeconds}
            />
          </p>
        </div>
      </div>
      <div className="summary-list">
        {items.map((item) => {
          const outcome =
            item.groomingOutcome ??
            (item.status === "estimated"
              ? "ready"
              : item.status === "skipped"
                ? "skipped"
                : null);
          return (
            <div className="summary-item" key={item.id}><a href={item.url} rel="noreferrer" target="_blank">
              <div>
                <b>{item.identifier}</b>
                <span>{item.title}</span>
              </div>
              <em className={outcome ?? "pending"}>
                {outcome === "ready" && !demoMode ? "Saved to Linear" : groomingOutcomeLabel(outcome)}
                {item.finalEstimate !== null && ` · ${voteLabel(item.finalEstimate, cards)}`}
                {item.elapsedSeconds > 0 && ` · ${formatDuration(item.elapsedSeconds)}`}
              </em>
            </a>{isFacilitator && item.status === "skipped" && <button type="button" disabled={busy} onClick={() => onResume(item.id)}>Revisit {item.identifier}</button>}</div>
          );
        })}
      </div>
      {copyFailed && (
        <label>
          <span role="alert">Could not copy automatically. Select and copy the summary below.</span>
          <textarea className="resize-none" aria-label="Session summary to copy" readOnly rows={8} value={summaryText} />
        </label>
      )}
      <div className="session-summary-actions">
        {isFacilitator && remaining[0] && (
          <button
            className="button button-primary"
            disabled={busy}
            onClick={() => onResume(remaining[0].id)}
            type="button"
          >
            Resume {remaining.length} remaining
          </button>
        )}
        <button className="button button-ghost" onClick={copySummary} type="button">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy summary"}
        </button>
        <Link className="button button-dark" href="/app">
          Back to sessions
        </Link>
      </div>
    </div>
  );
}

function Participant({
  person,
  online,
  revealed,
  cards,
  isFacilitator,
  onRole,
}: {
  person: SessionParticipant;
  online: boolean;
  revealed: boolean;
  cards: SessionSnapshot["estimateCards"];
  isFacilitator: boolean;
  onRole: (role: ParticipantRole, votingEnabled: boolean) => void;
}) {
  return (
    <div className={`participant ${online ? "online" : ""}`}>
      <span className="participant-avatar">{initials(person.name)}</span>
      <div>
        <b>{person.name}</b>
        {isFacilitator ? (
          <select
            aria-label={`Role for ${person.name}`}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "facilitator-voter") {
                onRole("facilitator", true);
              } else {
                const role = value as ParticipantRole;
                onRole(role, role === "voter");
              }
            }}
            value={
              person.role === "facilitator" && person.votingEnabled
                ? "facilitator-voter"
                : person.role
            }
          >
            <option value="facilitator">Facilitator</option>
            <option value="facilitator-voter">Facilitator + voter</option>
            <option value="voter">Voter</option>
            <option value="observer">Observer</option>
          </select>
        ) : (
          <small>
            {person.role === "facilitator" && person.votingEnabled
              ? "facilitator · voting"
              : person.role}
          </small>
        )}
      </div>
      <span className={`vote-status ${person.hasVoted ? "done" : ""} ${revealed ? "revealed" : ""}`}>
        {revealed && person.vote !== null ? (
          voteLabel(person.vote, cards)
        ) : person.hasVoted ? (
          <Check size={14} />
        ) : !person.votingEnabled ? (
          <Eye size={13} />
        ) : (
          "…"
        )}
      </span>
      <i className="presence-dot" />
    </div>
  );
}
