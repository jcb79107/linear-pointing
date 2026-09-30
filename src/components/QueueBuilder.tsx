"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  GripVertical,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Brand } from "@/components/Brand";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SlackInviteButton } from "@/components/SlackInviteButton";
import { TeamDefaultFields } from "@/components/TeamDefaultFields";
import { requestJson } from "@/lib/client-request";
import type {
  QueueSortPreset,
  SessionQueueItem,
  SessionSnapshot,
  TeamDefaults,
} from "@/lib/domain";
import { sortQueueItems } from "@/lib/queue-sort";

function QueueRow({
  item,
  index,
  count,
  busy,
  move,
  remove,
}: {
  item: SessionQueueItem;
  index: number;
  count: number;
  busy: boolean;
  move: (to: number) => void;
  remove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id, disabled: busy });
  return (
    <div
      className="queue-edit-row cycle-queue-row"
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className="drag-handle"
        type="button"
        disabled={busy}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.identifier} to reorder`}
      >
        <GripVertical size={17} />
      </button>
      <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
      <div className="cycle-ticket-title">
        <b>{item.title}</b>
        <small>
          {item.identifier} · {item.priorityLabel ?? "No priority"}
        </small>
      </div>
      <div className="queue-row-actions">
        <button
          aria-label={`Move ${item.identifier} up`}
          title="Move up"
          disabled={busy || index === 0}
          onClick={() => move(index - 1)}
          type="button"
        >
          <ArrowUp size={16} />
        </button>
        <button
          aria-label={`Move ${item.identifier} down`}
          title="Move down"
          disabled={busy || index === count - 1}
          onClick={() => move(index + 1)}
          type="button"
        >
          <ArrowDown size={16} />
        </button>
        <button
          aria-label={`Remove ${item.identifier}`}
          title="Remove from agenda"
          disabled={busy}
          onClick={remove}
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function QueueBuilder({
  initialSnapshot,
  settings,
}: {
  initialSnapshot: SessionSnapshot;
  settings: TeamDefaults;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [options, setOptions] = useState(settings);
  const [order, setOrder] = useState<QueueSortPreset>("manual");
  const [busy, setBusy] = useState<string | null>(null);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"reload" | "delete" | null>(null);
  const [copyFallback, setCopyFallback] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const queue = snapshot.queue;
  const sourceChanged =
    snapshot.intake && snapshot.intake.cycleOffset !== options.cycleOffset;
  const inviteUrl =
    typeof window === "undefined"
      ? `/s/${snapshot.code}`
      : `${window.location.origin}/s/${snapshot.code}`;

  async function run(label: string, work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      await work();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Try again.",
      );
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }
  async function request(path: string, method: string, body?: unknown) {
    const { data, response } = await requestJson<{
      error?: string;
      snapshot?: SessionSnapshot;
    }>(
      `/api/sessions/${snapshot.id}${path}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      90_000,
    );
    if (!response.ok)
      throw new Error(data.error ?? "Could not save. Try again.");
    return data;
  }
  async function refresh() {
    const result = await request("/snapshot", "GET");
    if (!result.snapshot)
      throw new Error("Could not refresh the agenda. Reload this page.");
    setSnapshot(result.snapshot);
  }
  function load() {
    setConfirm(null);
    void run("loading", async () => {
      const result = await request("/intake", "POST", options);
      if (!result.snapshot)
        throw new Error("Could not load the agenda. Try again.");
      setSnapshot(result.snapshot);
      setOrder(options.defaultSort);
      setNotice(
        `${result.snapshot.queue.length} unestimated tickets loaded. Review the agenda before starting.`,
      );
    });
  }
  function saveOrder(
    next: SessionQueueItem[],
    preset: QueueSortPreset = "manual",
  ) {
    void run("order", async () => {
      await request("/queue", "PATCH", {
        orderedItemIds: next.map((item) => item.id),
      });
      setSnapshot((current) => ({
        ...current,
        queue: next.map((item, position) => ({ ...item, position })),
      }));
      setOrder(preset);
      setNotice("Agenda order saved.");
    });
  }
  function dragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || busy) return;
    saveOrder(
      arrayMove(
        queue,
        queue.findIndex((item) => item.id === event.active.id),
        queue.findIndex((item) => item.id === event.over!.id),
      ),
    );
  }
  function start() {
    void run("starting", async () => {
      await request("/intake", "PATCH", options);
      await request("/start", "POST");
      router.push(`/sessions/${snapshot.id}`);
    });
  }
  return (
    <main className="prepare-shell">
      <header className="app-header">
        <Brand />
        <div className="prepare-header-actions">
          <Link className="button button-ghost" aria-label="Sessions" href="/app">
            <ArrowLeft size={16} /> Sessions
          </Link>
          <button
            className="button button-primary"
            disabled={Boolean(busy) || !queue.length || Boolean(sourceChanged)}
            onClick={start}
            type="button"
          >
            {busy === "starting" ? "Starting…" : "Start session"}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>
      <section className="prepare-main cycle-prepare">
        <div className="prepare-intro">
          <div>
            <p className="step-label">{snapshot.teamName}</p>
            <h1>Preview your agenda</h1>
            <p className="prepare-help">
              Prepare the tickets in Linear. Review the order here, then bring
              in the team.
            </p>
          </div>
        </div>
        <section className="cycle-source-card" aria-label="Session preparation">
          <TeamDefaultFields
            value={options}
            onChange={setOptions}
            disabled={Boolean(busy)}
          />
          <p className="cycle-policy">
            Unestimated tickets only. Completed and canceled work stays out.
            Changes here apply to this session.
          </p>
          <div className="cycle-source-actions">
            <button
              className="button button-primary"
              disabled={Boolean(busy)}
              onClick={() => (queue.length ? setConfirm("reload") : load())}
              type="button"
            >
              {busy === "loading"
                ? "Loading from Linear…"
                : snapshot.intake
                  ? "Reload agenda"
                  : "Load agenda"}
            </button>
            <Link href="/app/settings">Edit team defaults</Link>
          </div>
          {snapshot.intake && (
            <div className="cycle-resolved">
              <b>{snapshot.intake.name}</b>
              {snapshot.intake.startsAt && snapshot.intake.endsAt && (
                <span>
                  {new Date(snapshot.intake.startsAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}{" "}
                  –{" "}
                  {new Date(snapshot.intake.endsAt).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              )}
              {snapshot.intake.cycleId && <small>This agenda stays tied to this cycle.</small>}
            </div>
          )}
          {sourceChanged && (
            <p role="status">
              Load the new source before starting. Your current agenda is
              unchanged.
            </p>
          )}
        </section>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <p className="prepare-save-status" role="status">
          {busy === "order" ? "Saving order…" : notice}
        </p>
        <section
          className="queue-editor cycle-agenda"
          aria-label="Agenda preview"
        >
          <div className="card-heading">
            <div>
              <b>Agenda · {queue.length} tickets</b>
              <small>Reorder or remove tickets. Linear stays unchanged.</small>
            </div>
            {queue.length > 0 && (
              <label>
                Order
                <select
                  aria-label="Sort agenda"
                  disabled={Boolean(busy)}
                  value={order}
                  onChange={(e) => {
                    const next = e.target.value as QueueSortPreset;
                    saveOrder(sortQueueItems(queue, next), next);
                  }}
                >
                  <option value="manual">Your agenda order</option>
                  <option value="linear">Linear manual order</option>
                  <option value="priority">Priority</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            )}
          </div>
          {!queue.length ? (
            <div className="queue-empty">
              <b>
                {snapshot.intake
                  ? "No tickets to point"
                  : "Your agenda starts in Linear"}
              </b>
              <p>
                {snapshot.intake
                  ? snapshot.intake.cycleId
                    ? "Add unestimated tickets to this cycle in Linear, then reload. Or choose another cycle above."
                    : "Add unestimated tickets without a cycle in Linear, then reload. Or choose a cycle above."
                  : "Choose a cycle and load its unestimated tickets."}
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={dragEnd}
            >
              <SortableContext
                items={queue.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="queue-edit-list">
                  {queue.map((item, index) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      index={index}
                      count={queue.length}
                      busy={Boolean(busy)}
                      move={(to) => saveOrder(arrayMove(queue, index, to))}
                      remove={() =>
                        void run("remove", async () => {
                          await request(`/queue?itemId=${item.id}`, "DELETE");
                          await refresh();
                          setNotice(
                            `${item.identifier} removed from this agenda.`,
                          );
                        })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
        <div className="cycle-share">
          <button
            className="button button-ghost"
            onClick={() =>
              void run("copy", async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setNotice("Invite link copied.");
                } catch {
                  setCopyFallback(true);
                }
              })
            }
            type="button"
          >
            <Copy size={16} /> Copy invite link
          </button>
          <SlackInviteButton
            sessionId={snapshot.id}
            title={snapshot.title}
            teamName={snapshot.teamName}
            issueCount={queue.length}
            code={snapshot.code}
          />
          <button
            className="button button-ghost"
            disabled={Boolean(busy)}
            onClick={() => setConfirm("delete")}
            type="button"
          >
            <Trash2 size={16} /> Delete draft
          </button>
        </div>
        {copyFallback && (
          <label>
            Copy this invite link
            <input
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.target.select()}
            />
          </label>
        )}
        <p className="cycle-scale">
          <Check size={14} /> Linear estimate scale:{" "}
          {snapshot.estimateCards.map((card) => card.label).join(" · ")}
        </p>
      </section>
      <ConfirmDialog
        open={confirm === "reload"}
        busy={Boolean(busy)}
        title="Reload this agenda?"
        description="Replace the preview with all unestimated tickets from the selected cycle."
        detail="Your removed tickets may return and the order will reset. Linear tickets stay unchanged."
        confirmLabel="Reload agenda"
        onCancel={() => setConfirm(null)}
        onConfirm={load}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        busy={Boolean(busy)}
        title="Delete this draft?"
        description={`Delete “${snapshot.title}” and its agenda?`}
        detail="Linear tickets stay unchanged."
        confirmLabel="Delete draft"
        onCancel={() => setConfirm(null)}
        onConfirm={() =>
          void run("delete", async () => {
            await request("", "DELETE");
            router.push("/app");
          })
        }
      />
    </main>
  );
}
