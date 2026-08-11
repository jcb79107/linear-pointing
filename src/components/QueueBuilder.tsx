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
  Check,
  CirclePlus,
  GripVertical,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Brand } from "@/components/Brand";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  LinearIssueSummary,
  SessionQueueItem,
  SessionSnapshot,
} from "@/lib/domain";
import type { LinearIssueFilterOptions } from "@/lib/linear";

function SortableQueueRow({
  item,
  index,
  onRemove,
}: {
  item: SessionQueueItem;
  index: number;
  onRemove: () => void;
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
          : `${item.currentEstimate} pts`}
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
}: {
  initialSnapshot: SessionSnapshot;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(initialSnapshot.queue);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<LinearIssueFilterOptions | null>(null);
  const [cycleId, setCycleId] = useState("");
  const [results, setResults] = useState<LinearIssueSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);
  const [activePanel, setActivePanel] = useState<"find" | "queue">("find");
  const [searching, setSearching] = useState(false);
  const [bulkAdding, setBulkAdding] = useState<"all" | "cycle" | null>(null);
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
          setCycleId((current) => current || data.filters.activeCycleId || "");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initialSnapshot.teamId]);

  async function refreshSnapshot() {
    const response = await fetch(
      `/api/sessions/${initialSnapshot.id}/snapshot`,
      { cache: "no-store" },
    );
    const data = await response.json();
    if (response.ok) setQueue(data.snapshot.queue);
  }

  async function searchIssues() {
    setSearching(true);
    setError(null);
    setNotice(null);
    setSelected(new Set());
    setHasSearched(true);
    const params = new URLSearchParams({
      teamId: initialSnapshot.teamId,
      ...(query ? { query } : {}),
    });
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
          body: JSON.stringify({ issueIds: issues.map((issue) => issue.id) }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSelected(new Set());
      setResults([]);
      setQuery("");
      setHasSearched(false);
      await refreshSnapshot();
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

  async function addBulkIssues(input: {
    source: "all" | "cycle";
    cycleId?: string;
    sourceLabel: string;
  }) {
    setBulkAdding(input.source);
    setError(null);
    setNotice(null);
    try {
      const params = new URLSearchParams({
        teamId: initialSnapshot.teamId,
        ...(input.cycleId ? { cycleId: input.cycleId } : {}),
        all: "true",
      });
      const searchResponse = await fetch(`/api/linear/issues?${params}`);
      const searchData = await searchResponse.json();
      if (!searchResponse.ok) throw new Error(searchData.error);

      const queuedIds = new Set(queue.map((item) => item.linearIssueId));
      const issueIds = (searchData.issues as LinearIssueSummary[])
        .filter((issue) => !queuedIds.has(issue.id))
        .map((issue) => issue.id);
      if (!issueIds.length) {
        setNotice(
          `Every Todo ticket without points in ${input.sourceLabel} is already queued.`,
        );
        return;
      }

      const addResponse = await fetch(
        `/api/sessions/${initialSnapshot.id}/queue`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ issueIds }),
        },
      );
      const addData = await addResponse.json();
      if (!addResponse.ok) throw new Error(addData.error);
      setSelected(new Set());
      setResults([]);
      setQuery("");
      setHasSearched(false);
      await refreshSnapshot();
      setActivePanel("queue");
      setNotice(
        `Added ${issueIds.length} Todo ${
          issueIds.length === 1 ? "ticket" : "tickets"
        } from ${input.sourceLabel}.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `Could not add tickets from ${input.sourceLabel}`,
      );
    } finally {
      setBulkAdding(null);
    }
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

  const selectedCycle = filters?.cycles.find(
    (cycle) => cycle.id === cycleId,
  );
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
              Add every unpointed Todo ticket, narrow to a cycle, or search.
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
                  <small>Backlog tickets are excluded automatically</small>
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
              <section className="quick-add-card">
                <span className="quick-add-eyebrow">OPTION 1</span>
                <b>Add everything to point</b>
                <p>Every unpointed Todo ticket across the team.</p>
                <div className="backlog-source">
                  <span>Todo</span>
                  <small>Unpointed only</small>
                </div>
                <button
                  className="button button-primary"
                  disabled={Boolean(bulkAdding) || busy}
                  onClick={() =>
                    void addBulkIssues({
                      source: "all",
                      sourceLabel: "Todo",
                    })
                  }
                  type="button"
                >
                  <CirclePlus size={15} />
                  {bulkAdding === "all"
                    ? "Adding tickets…"
                    : "Add all Todo tickets"}
                </button>
              </section>
              <section className="quick-add-card">
                <span className="quick-add-eyebrow">OPTION 2</span>
                <b>Add one cycle</b>
                <p>Only unpointed Todo tickets from the selected cycle.</p>
                <FilterSelect
                  disabled={!filters}
                  label={filters ? "Choose a cycle" : "Loading cycles…"}
                  onChange={(value) => {
                    setCycleId(value);
                    setSelected(new Set());
                  }}
                  options={filters?.cycles ?? []}
                  value={cycleId}
                />
                <button
                  className="button button-primary"
                  disabled={!cycleId || Boolean(bulkAdding) || busy}
                  onClick={() =>
                    void addBulkIssues({
                      source: "cycle",
                      cycleId,
                      sourceLabel: selectedCycle?.name ?? "the cycle",
                    })
                  }
                  type="button"
                >
                  <CirclePlus size={15} />
                  {bulkAdding === "cycle"
                    ? "Adding cycle…"
                    : selectedCycle
                      ? `Add ${selectedCycle.name}`
                      : "Add cycle"}
                </button>
              </section>
            </div>
            <div className="manual-picker-label">
              <span>OPTION 3 · ADD INDIVIDUAL TICKETS</span>
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
                      : "Search by title or ticket ID. Only unpointed Todo tickets are shown."}
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
                          : `${issue.estimate} pts`}
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
                <button
                  className="clear-agenda-button"
                  disabled={busy}
                  onClick={() => setConfirmAction("clear-agenda")}
                  type="button"
                >
                  <Trash2 size={14} />
                  Clear agenda
                </button>
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

function FilterSelect({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; name: string }>;
  value: string;
}) {
  return (
    <select
      aria-label={label}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
