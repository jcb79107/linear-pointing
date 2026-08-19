"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDownAZ,
  Check,
  CirclePlus,
  GripVertical,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Brand } from "@/components/Brand";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  EstimateCard,
  LinearIssueSummary,
  QueueSortPreset,
  SessionQueueItem,
  SessionSnapshot,
  UserSettings,
} from "@/lib/domain";
import { voteLabel } from "@/lib/estimates";
import type { LinearIssueFilterOptions } from "@/lib/linear";
import { sortQueueItems } from "@/lib/queue-sort";

function SortableQueueRow({
  item,
  index,
  onRemove,
  cards,
}: {
  item: SessionQueueItem;
  index: number;
  onRemove: () => void;
  cards: EstimateCard[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  return (
    <div
      className={`queue-edit-row ${isDragging ? "dragging" : ""}`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        aria-label={`Drag ${item.identifier} to reorder`}
        className="drag-handle"
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={17} />
      </button>
      <span className="queue-number">{String(index + 1).padStart(2, "0")}</span>
      <div>
        <b>{item.title}</b>
        <small>
          {item.identifier} · {item.priorityLabel ?? "No priority"}
        </small>
      </div>
      <span className="estimate-pill">
        {item.currentEstimate === null
          ? "Unpointed"
          : voteLabel(item.currentEstimate, cards)}
      </span>
      <button
        aria-label={`Remove ${item.identifier}`}
        className="remove-queue-item"
        onClick={onRemove}
        type="button"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function QueueBuilder({
  initialSnapshot,
  settings,
}: {
  initialSnapshot: SessionSnapshot;
  settings: UserSettings;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialSnapshot.queue);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LinearIssueFilterOptions | null>(null);
  const [results, setResults] = useState<LinearIssueSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [activePanel, setActivePanel] = useState<"find" | "queue">("find");
  const [searching, setSearching] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [cycleScope, setCycleScope] = useState(settings.cycleScope);
  const [stateTypes, setStateTypes] = useState(settings.stateTypes);
  const [estimateScope, setEstimateScope] = useState(settings.estimateScope);
  const [assigneeScope, setAssigneeScope] = useState(settings.assigneeScope);
  const [sortPreset, setSortPreset] = useState<QueueSortPreset>(
    settings.defaultSort,
  );
  const [busy, setBusy] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "clear-agenda" | "delete-session" | null
  >(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    let active = true;
    fetch(`/api/linear/filters?teamId=${initialSnapshot.teamId}`)
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (active) {
          setFilters(data.filters);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialSnapshot.teamId]);

  function buildIssueParams(fetchAll = false) {
    return new URLSearchParams({
      teamId: initialSnapshot.teamId,
      cycleScope,
      stateTypes: stateTypes.join(","),
      estimateScope,
      assigneeScope,
      ...(query ? { query } : {}),
      ...(fetchAll ? { all: "true" } : {}),
    });
  }

  async function refreshSnapshot(): Promise<SessionQueueItem[]> {
    const response = await fetch(
      `/api/sessions/${initialSnapshot.id}/snapshot`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (response.ok) {
      setQueue(data.snapshot.queue);
      return data.snapshot.queue;
    }
    return queue;
  }

  async function searchIssues() {
    setSearching(true);
    setError(null);
    setNotice(null);
    setSelected(new Set());
    setHasSearched(true);
    const params = buildIssueParams();
    try {
      const response = await fetch(`/api/linear/issues?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const queued = new Set(queue.map((item) => item.linearIssueId));
      setResults(
        data.issues.filter(
          (issue: LinearIssueSummary) => !queued.has(issue.id),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function addSelected() {
    const issues = results.filter((issue) => selected.has(issue.id));
    if (!issues.length) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/sessions/${initialSnapshot.id}/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueIds: issues.map((issue) => issue.id),
            stateTypes,
            estimateScope,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(new Set());
      setResults([]);
      setQuery("");
      setHasSearched(false);
      const refreshed = await refreshSnapshot();
      await applySort(settings.defaultSort, refreshed);
      setNotice(
        `Added ${issues.length} ${
          issues.length === 1 ? "ticket" : "tickets"
        } to the agenda.`,
      );
      setActivePanel("queue");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not add tickets",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addMatchingTickets() {
    setBulkAdding(true);
    setError(null);
    setNotice(null);
    try {
      const params = buildIssueParams(true);
      const searchResponse = await fetch(`/api/linear/issues?${params}`);
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(searchData.error);
      const selectedCycle = searchData.selectedCycle;
      if (cycleScope !== "any" && !selectedCycle) {
        setNotice(
          `Linear does not have ${cycleScope === "active" ? "an active" : "an upcoming"} cycle for this team.`,
        );
        return;
      }

      const queuedIds = new Set(queue.map((item) => item.linearIssueId));
      const issueIds = (searchData.issues as LinearIssueSummary[])
        .filter((issue) => !queuedIds.has(issue.id))
        .slice(0, 1000)
        .map((issue) => issue.id);
      if (!issueIds.length) {
        setNotice(
          "Every ticket matching these filters is already queued.",
        );
        return;
      }

      const addResponse = await fetch(
        `/api/sessions/${initialSnapshot.id}/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueIds, stateTypes, estimateScope }),
        },
      );
      const addData = await addResponse.json();
      if (!addResponse.ok) throw new Error(addData.error);
      setSelected(new Set());
      setResults([]);
      setQuery("");
      setHasSearched(false);
      const refreshed = await refreshSnapshot();
      await applySort(settings.defaultSort, refreshed);
      setActivePanel("queue");
      setNotice(
        `Added ${issueIds.length} matching ${
          issueIds.length === 1 ? "ticket" : "tickets"
        }${selectedCycle ? ` from ${selectedCycle.name}` : ""}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not add matching Linear tickets",
      );
    } finally {
      setBulkAdding(false);
    }
  }

  async function applySort(
    preset: QueueSortPreset,
    items: SessionQueueItem[] = queue,
  ) {
    if (!items.length) return;
    const sorted = sortQueueItems(items, preset, settings.customSortRules).map(
      (item, position) => ({ ...item, position }),
    );
    setSortPreset(preset);
    setQueue(sorted);
    await persistOrder(sorted);
  }

  async function persistOrder(items: SessionQueueItem[]) {
    setOrderStatus("saving");
    const response = await fetch(
      `/api/sessions/${initialSnapshot.id}/queue`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderedItemIds: items.map((item) => item.id),
        }),
      },
    );
    if (!response.ok) {
      const data = await response.json();
      setError(data.error);
      await refreshSnapshot();
      setOrderStatus("idle");
      return;
    }
    setOrderStatus("saved");
    window.setTimeout(() => setOrderStatus("idle"), 1600);
  }

  async function removeItem(item: SessionQueueItem) {
    setError(null);
    const response = await fetch(
      `/api/sessions/${initialSnapshot.id}/queue?itemId=${item.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not remove issue");
      return;
    }
    setQueue((current) =>
      current
        .filter((candidate) => candidate.id !== item.id)
        .map((candidate, position) => ({ ...candidate, position })),
    );
  }

  async function clearAgenda() {
    if (!queue.length) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/sessions/${initialSnapshot.id}/queue?all=true`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setQueue([]);
      setResults([]);
      setSelected(new Set());
      setHasSearched(false);
      setActivePanel("find");
      setConfirmAction(null);
      setNotice("Agenda cleared. Your Linear tickets were not changed.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not clear the agenda",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = queue.findIndex((item) => item.id === active.id);
    const newIndex = queue.findIndex((item) => item.id === over.id);
    const reordered = arrayMove(queue, oldIndex, newIndex).map(
      (item, position) => ({ ...item, position }),
    );
    setQueue(reordered);
    void persistOrder(reordered);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSelected(new Set());
    setHasSearched(false);
    setError(null);
    setNotice(null);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const queuedMatch = normalizedQuery
    ? queue.find(
        (item) =>
          item.identifier.toLowerCase() === normalizedQuery ||
          item.title.toLowerCase().includes(normalizedQuery),
      )
    : null;
  const allResultsSelected =
    results.length > 0 && results.every((issue) => selected.has(issue.id));

  async function startSession() {
    setBusy(true);
    setError(null);
    const response = await fetch(
      `/api/sessions/${initialSnapshot.id}/start`,
      { method: "POST" },
    );
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      setBusy(false);
      return;
    }
    router.push(`/sessions/${initialSnapshot.id}`);
  }

  async function deleteSession() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/sessions/${initialSnapshot.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Could not delete this session");
      setBusy(false);
      return;
    }
    setConfirmAction(null);
    router.push("/app");
  }

  return (
    <main className="prepare-shell">
      <header className="prepare-header">
        <div className="prepare-brand">
          <Brand />
          <span />
          <div>
            <b>{initialSnapshot.title}</b>
            <small>{initialSnapshot.teamName}</small>
          </div>
        </div>
        <div className="prepare-actions">
          <button
            aria-label="Delete draft session"
            className="button button-ghost prepare-delete"
            disabled={busy || Boolean(bulkAdding)}
            onClick={() => setConfirmAction("delete-session")}
            title="Delete draft session"
            type="button"
          >
            <Trash2 size={16} />
          </button>
          <Link className="button button-ghost" href="/app">
            <ArrowLeft size={16} /> Sessions
          </Link>
          <button
            className="button button-primary"
            disabled={!queue.length || busy || Boolean(bulkAdding)}
            onClick={startSession}
            type="button"
          >
            {busy ? (
              "Starting…"
            ) : (
              <>
                <span className="desktop-start-label">Start live session</span>
                <span className="mobile-start-label">Start</span>
              </>
            )}
            {!busy && queue.length > 0 && (
              <span className="start-count">{queue.length}</span>
            )}
            <ArrowRight size={16} />
          </button>
        </div>
      </header>

      <section className="prepare-main">
        <div className="prepare-intro">
          <div>
            <p className="step-label">BUILD THE AGENDA</p>
            <h1>What should the team point?</h1>
            <p className="prepare-help">
              Pull a filtered set from Linear, fine-tune the order, then share
              the room.
            </p>
          </div>
          <div className="queue-stat">
            <b>{queue.length}</b>
            <span>issues queued</span>
          </div>
        </div>

        {(error || notice) && (
          <div className="prepare-feedback">
            {error && <div className="form-error">{error}</div>}
            {notice && <div className="form-notice">{notice}</div>}
          </div>
        )}

        <div className="prepare-panel-tabs">
          <button
            className={activePanel === "find" ? "active" : ""}
            onClick={() => setActivePanel("find")}
            type="button"
          >
            Find tickets
          </button>
          <button
            className={activePanel === "queue" ? "active" : ""}
            onClick={() => setActivePanel("queue")}
            type="button"
          >
            Agenda <span>{queue.length}</span>
          </button>
        </div>

        <div className="prepare-grid">
          <section
            className={`issue-finder ${
              activePanel !== "find" ? "prepare-panel-hidden" : ""
            }`}
          >
            <div className="card-heading">
              <div>
                <span className="heading-icon">
                  <Search size={17} />
                </span>
                <div>
                  <b>Add tickets</b>
                  <small>Editable Linear filters for this session</small>
                </div>
              </div>
              {selected.size > 0 && (
                <button
                  className="button button-dark"
                  disabled={busy}
                  onClick={addSelected}
                  type="button"
                >
                  <CirclePlus size={15} /> Add {selected.size} to agenda
                </button>
              )}
            </div>
            <div className="quick-add-grid">
              <section className="quick-add-card filter-card">
                <span className="quick-add-eyebrow">
                  <SlidersHorizontal size={13} /> LINEAR INTAKE
                </span>
                <b>Add matching tickets</b>
                <p>
                  Pull a ready-made batch, or use the same filters to search by
                  title and identifier.
                </p>
                <div className="intake-filter-grid">
                  <label>
                    Cycle
                    <select
                      onChange={(event) =>
                        setCycleScope(
                          event.target.value as UserSettings["cycleScope"],
                        )
                      }
                      value={cycleScope}
                    >
                      <option value="upcoming">Upcoming cycle</option>
                      <option value="active">Active cycle</option>
                      <option value="any">Any cycle / backlog</option>
                    </select>
                  </label>
                  <label>
                    Estimates
                    <select
                      onChange={(event) =>
                        setEstimateScope(
                          event.target.value as UserSettings["estimateScope"],
                        )
                      }
                      value={estimateScope}
                    >
                      <option value="unestimated">Unestimated</option>
                      <option value="estimated">Estimated</option>
                      <option value="any">Any estimate</option>
                    </select>
                  </label>
                  <label>
                    Assignee
                    <select
                      onChange={(event) =>
                        setAssigneeScope(
                          event.target.value as UserSettings["assigneeScope"],
                        )
                      }
                      value={assigneeScope}
                    >
                      <option value="anyone">Anyone</option>
                      <option value="me">Assigned to me</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </label>
                </div>
                <div className="intake-statuses">
                  <span>Status</span>
                  {([
                    ["backlog", "Backlog"],
                    ["unstarted", "Todo"],
                    ["started", "In Progress"],
                  ] as const).map(([value, label]) => (
                    <label key={value}>
                      <input
                        checked={stateTypes.includes(value)}
                        onChange={(event) => {
                          const next = event.target.checked
                            ? [...stateTypes, value]
                            : stateTypes.filter((state) => state !== value);
                          if (next.length) setStateTypes(next);
                        }}
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="backlog-source">
                  <span>
                    {cycleScope === "upcoming"
                      ? filters?.upcomingCycle?.name ??
                        (filters ? "No upcoming cycle" : "Finding cycle…")
                      : cycleScope === "active"
                        ? filters?.activeCycle?.name ??
                          (filters ? "No active cycle" : "Finding cycle…")
                        : "All matching team tickets"}
                  </span>
                  <small>
                    {settings.defaultSort === "linear"
                      ? "Linear order"
                      : "Your default order"}
                  </small>
                </div>
                <button
                  className="button button-primary"
                  disabled={
                    (cycleScope === "upcoming" && !filters?.upcomingCycle) ||
                    (cycleScope === "active" && !filters?.activeCycle) ||
                    bulkAdding ||
                    busy
                  }
                  onClick={() => void addMatchingTickets()}
                  type="button"
                >
                  <CirclePlus size={15} />
                  {bulkAdding ? "Adding matching tickets…" : "Add all matches"}
                </button>
              </section>
            </div>
            <div className="manual-picker-label">
              <span>ADD INDIVIDUAL TICKETS</span>
              {query && (
                <button onClick={clearSearch} type="button">
                  Clear search
                </button>
              )}
            </div>
            <div className="search-controls">
              <div className="search-input">
                <Search size={17} />
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void searchIssues();
                  }}
                  placeholder="Search title or KEY-123…"
                  value={query}
                />
                {query && (
                  <button
                    aria-label="Clear ticket search"
                    onClick={clearSearch}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                className="button button-dark"
                disabled={searching}
                onClick={searchIssues}
                type="button"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {results.length > 0 && (
              <div className="result-toolbar">
                <span>
                  {results.length === 50
                    ? "50 newest matches"
                    : `${results.length} ${
                        results.length === 1 ? "ticket" : "tickets"
                      }`}
                </span>
                <button
                  onClick={() =>
                    setSelected(
                      allResultsSelected
                        ? new Set()
                        : new Set(results.map((issue) => issue.id)),
                    )
                  }
                  type="button"
                >
                  {allResultsSelected ? "Clear selection" : "Select all"}
                </button>
              </div>
            )}
            <div className="issue-results">
              {searching ? (
                <div className="finder-empty finder-loading">
                  <span className="loading-ring" />
                  <b>Loading tickets from Linear…</b>
                  <p>Large teams can take a moment.</p>
                </div>
              ) : results.length === 0 ? (
                <div className="finder-empty">
                  {queuedMatch ? <Check size={21} /> : <Search size={21} />}
                  <b>
                    {queuedMatch
                      ? "Already in the agenda"
                      : hasSearched
                      ? "No matching tickets"
                      : "Find tickets for this session"}
                  </b>
                  <p>
                    {queuedMatch
                      ? `${queuedMatch.identifier} is already ready for the meeting.`
                      : hasSearched
                      ? "Try another title or ticket ID."
                      : "Search by title or ticket ID using the filters above."}
                  </p>
                  {queuedMatch ? (
                    <button onClick={() => setActivePanel("queue")} type="button">
                      View agenda
                    </button>
                  ) : hasSearched ? (
                    <button onClick={clearSearch} type="button">
                      Clear search
                    </button>
                  ) : (
                    <button onClick={searchIssues} type="button">
                      Load tickets to point
                    </button>
                  )}
                </div>
              ) : (
                results.map((issue) => {
                  const checked = selected.has(issue.id);
                  return (
                    <button
                      className={`issue-result ${checked ? "selected" : ""}`}
                      key={issue.id}
                      onClick={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (next.has(issue.id)) next.delete(issue.id);
                          else next.add(issue.id);
                          return next;
                        })
                      }
                      type="button"
                    >
                      <span className="result-check">
                        {checked && <Check size={13} />}
                      </span>
                      <div>
                        <b>{issue.title}</b>
                        <small>
                          {issue.identifier} ·{" "}
                          {issue.priorityLabel ?? "No priority"}
                        </small>
                      </div>
                      <span>
                        {issue.estimate === null
                          ? "Unpointed"
                          : voteLabel(
                              issue.estimate,
                              initialSnapshot.estimateCards,
                            )}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section
            className={`queue-editor ${
              activePanel !== "queue" ? "prepare-panel-hidden" : ""
            }`}
          >
            <div className="card-heading">
              <div>
                <span className="heading-icon dark">
                  <GripVertical size={17} />
                </span>
                <div>
                  <b>Meeting order</b>
                  <small>
                    {orderStatus === "saving"
                      ? "Saving order…"
                      : orderStatus === "saved"
                        ? "Order saved"
                        : "Drag tickets into discussion order"}
                  </small>
                </div>
              </div>
              {queue.length > 0 && (
                <div className="agenda-tools">
                  <label>
                    <ArrowDownAZ size={14} />
                    <select
                      aria-label="Sort agenda"
                      onChange={(event) =>
                        void applySort(
                          event.target.value as QueueSortPreset,
                        )
                      }
                      value={sortPreset}
                    >
                      <option value="linear">Linear order</option>
                      <option value="priority">Priority</option>
                      <option value="oldest">Oldest first</option>
                      <option value="newest">Newest first</option>
                      <option value="updated">Recently updated</option>
                      <option value="identifier">Identifier</option>
                      <option value="title">Title A–Z</option>
                      <option value="custom">My custom rules</option>
                    </select>
                  </label>
                  <button
                    className="clear-agenda-button"
                    disabled={busy}
                    onClick={() => setConfirmAction("clear-agenda")}
                    type="button"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
              )}
            </div>
            {queue.length === 0 ? (
              <div className="queue-empty">
                <span>01</span>
                <span>02</span>
                <span>03</span>
                <b>No issues in the room yet</b>
                <p>Select work from Linear to begin the agenda.</p>
              </div>
            ) : (
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                sensors={sensors}
              >
                <SortableContext
                  items={queue.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="queue-edit-list">
                    {queue.map((item, index) => (
                      <SortableQueueRow
                        cards={initialSnapshot.estimateCards}
                        index={index}
                        item={item}
                        key={item.id}
                        onRemove={() => void removeItem(item)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </div>
      </section>

      <ConfirmDialog
        busy={busy}
        confirmLabel="Clear agenda"
        description={`Remove all ${queue.length} ${
          queue.length === 1 ? "ticket" : "tickets"
        } from this draft?`}
        detail="The tickets and their estimates will stay unchanged in Linear."
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void clearAgenda()}
        open={confirmAction === "clear-agenda"}
        title="Clear this agenda?"
      />
      <ConfirmDialog
        busy={busy}
        confirmLabel="Delete session"
        description={`Delete “${initialSnapshot.title}” and its agenda?`}
        detail="This only removes the pointing session. Linear tickets will not be changed."
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => void deleteSession()}
        open={confirmAction === "delete-session"}
        title="Delete this draft session?"
      />
    </main>
  );
}
