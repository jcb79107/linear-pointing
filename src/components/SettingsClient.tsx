"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Link2,
  Plus,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Brand } from "@/components/Brand";
import type {
  LinearTeamSummary,
  PointingPreset,
  QueueSortField,
  QueueSortPreset,
  UserSettings,
} from "@/lib/domain";
import {
  linearTeamEstimateCards,
  presetPointValues,
  resolvePointingCards,
} from "@/lib/estimates";

interface SettingsClientProps {
  user: { name: string; email: string | null };
  teams: LinearTeamSummary[];
  initialSettings: UserSettings;
  hasWriteScope: boolean;
}

const deckOptions: Array<{
  id: PointingPreset;
  name: string;
  description: string;
}> = [
  {
    id: "linear-team",
    name: "Follow Linear",
    description: "Mirror each team’s configured Linear scale, including zero and extended cards.",
  },
  { id: "linear", name: "Linear", description: "0, 1, 2, 3, 4, 5" },
  { id: "fibonacci", name: "Fibonacci", description: "0, 1, 2, 3, 5, 8, 13" },
  { id: "powers-of-two", name: "Powers of two", description: "0, 1, 2, 4, 8, 16, 32" },
  { id: "custom", name: "Custom deck", description: "Choose your own numeric cards" },
];

const sortOptions: Array<{ id: QueueSortPreset; name: string }> = [
  { id: "linear", name: "Linear manual order" },
  { id: "priority", name: "Priority, then identifier" },
  { id: "oldest", name: "Oldest created first" },
  { id: "newest", name: "Newest created first" },
  { id: "updated", name: "Recently updated first" },
  { id: "identifier", name: "Ticket identifier" },
  { id: "title", name: "Title A–Z" },
  { id: "custom", name: "My custom rules" },
];

const sortFields: Array<{ id: QueueSortField; name: string }> = [
  { id: "priority", name: "Priority" },
  { id: "createdAt", name: "Created date" },
  { id: "updatedAt", name: "Updated date" },
  { id: "identifier", name: "Identifier" },
  { id: "title", name: "Title" },
  { id: "estimate", name: "Current estimate" },
];

function parsePointValues(value: string): number[] | null {
  const parts = value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  const values = parts.map(Number);
  if (
    values.some((point) => !Number.isInteger(point) || point < 0 || point > 100) ||
    new Set(values).size !== values.length ||
    values.some((point, index) => index > 0 && point <= values[index - 1])
  ) {
    return null;
  }
  return values;
}

export function SettingsClient({
  user,
  teams,
  initialSettings,
  hasWriteScope,
}: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [customValues, setCustomValues] = useState(
    initialSettings.customPointValues.join(", "),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedCustomValues = useMemo(
    () => parsePointValues(customValues),
    [customValues],
  );
  const previewValues =
    settings.pointingPreset === "linear-team"
      ? null
      : presetPointValues(
          settings.pointingPreset,
          parsedCustomValues ?? settings.customPointValues,
        );
  const compatibility = teams.map((team) => {
    try {
      resolvePointingCards(
        {
          pointingPreset: settings.pointingPreset,
          customPointValues: parsedCustomValues ?? settings.customPointValues,
        },
        team,
      );
      return { team, compatible: true };
    } catch {
      return { team, compatible: false };
    }
  });

  async function save() {
    if (settings.pointingPreset === "custom" && !parsedCustomValues) {
      setError("Enter 2–15 unique whole numbers in ascending order.");
      return;
    }
    const next = {
      ...settings,
      customPointValues: parsedCustomValues ?? settings.customPointValues,
    };
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save settings");
      setSettings(data.settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="settings-shell">
      <header className="app-header settings-header">
        <Brand />
        <div className="settings-header-actions">
          <Link className="button button-ghost" href="/app">
            <ArrowLeft size={16} /> Sessions
          </Link>
          <button className="button button-primary" disabled={saving} onClick={save} type="button">
            {saved ? <Check size={17} /> : <Save size={17} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save defaults"}
          </button>
        </div>
      </header>

      <section className="settings-main">
        <div className="settings-intro">
          <div>
            <p className="step-label">YOUR WORKFLOW</p>
            <h1>Pointing defaults</h1>
            <p>Set the deck, Linear intake, and agenda order you want for new sessions.</p>
          </div>
          <span>Applies to sessions you create</span>
        </div>

        {error && <div className="form-error settings-feedback">{error}</div>}

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            <a href="#linear"><Link2 size={16} /> Linear connection</a>
            <a href="#deck"><Sparkles size={16} /> Pointing deck</a>
            <a href="#tickets"><SlidersHorizontal size={16} /> Ticket intake</a>
            <a href="#sorting"><ChevronDown size={16} /> Agenda order</a>
          </nav>

          <div className="settings-sections">
            <section className="settings-card" id="linear">
              <div className="settings-card-heading">
                <span className="settings-icon"><Link2 size={18} /></span>
                <div>
                  <h2>Linear connection</h2>
                  <p>Identity, ticket reads, and estimate write-back.</p>
                </div>
              </div>
              <div className="connection-row">
                <span className="connection-status"><Check size={15} /></span>
                <div>
                  <b>{user.name}</b>
                  <small>{user.email ?? "Linear account"} · Any workspace can connect</small>
                </div>
                <span className={`scope-badge ${hasWriteScope ? "ready" : "warning"}`}>
                  {hasWriteScope ? "Read + write" : "Read only"}
                </span>
              </div>
              <div className="settings-inline-note">
                <p>
                  This deployment has no workspace allowlist. Reconnect if you switch workspaces or need to grant estimate write access.
                </p>
                <a className="button button-ghost" href="/api/auth/linear/start?write=true&returnTo=/app/settings">
                  Reconnect Linear <ExternalLink size={14} />
                </a>
              </div>
            </section>

            <section className="settings-card" id="deck">
              <div className="settings-card-heading">
                <span className="settings-icon orange"><Sparkles size={18} /></span>
                <div>
                  <h2>Pointing deck</h2>
                  <p>New sessions snapshot this deck. Existing rooms never change underneath you.</p>
                </div>
              </div>
              <div className="deck-grid">
                {deckOptions.map((option) => (
                  <button
                    className={`deck-option ${settings.pointingPreset === option.id ? "selected" : ""}`}
                    key={option.id}
                    onClick={() => setSettings((current) => ({ ...current, pointingPreset: option.id }))}
                    type="button"
                  >
                    <span>{settings.pointingPreset === option.id && <Check size={14} />}</span>
                    <b>{option.name}</b>
                    <small>{option.description}</small>
                  </button>
                ))}
              </div>
              {settings.pointingPreset === "custom" && (
                <label className="settings-field custom-values-field">
                  Custom values
                  <input
                    aria-invalid={!parsedCustomValues}
                    onChange={(event) => setCustomValues(event.target.value)}
                    placeholder="0, 1, 2, 3, 5, 8, 13"
                    value={customValues}
                  />
                  <small>Use 2–15 unique whole numbers, lowest to highest.</small>
                </label>
              )}
              <div className="deck-preview">
                <span>PREVIEW</span>
                <div>
                  {previewValues ? (
                    previewValues.map((value) => <b key={value}>{value}</b>)
                  ) : (
                    <em>Each session follows its selected Linear team.</em>
                  )}
                </div>
              </div>
              {settings.pointingPreset !== "linear-team" && teams.length > 0 && (
                <div className="compatibility-list">
                  {compatibility.map(({ team, compatible }) => (
                    <span className={compatible ? "compatible" : "incompatible"} key={team.id}>
                      {compatible ? <Check size={13} /> : <CircleAlert size={13} />}
                      {team.name}: {compatible ? "ready" : `accepts ${linearTeamEstimateCards(team).map((card) => card.label).join(", ")}`}
                    </span>
                  ))}
                </div>
              )}
              <label className="toggle-row">
                <span>
                  <b>Reveal when everyone has voted</b>
                  <small>Facilitators can still reveal early or trigger a revote.</small>
                </span>
                <input
                  checked={settings.autoReveal}
                  onChange={(event) => setSettings((current) => ({ ...current, autoReveal: event.target.checked }))}
                  type="checkbox"
                />
              </label>
            </section>

            <section className="settings-card" id="tickets">
              <div className="settings-card-heading">
                <span className="settings-icon blue"><SlidersHorizontal size={18} /></span>
                <div>
                  <h2>Ticket intake</h2>
                  <p>Pre-fill the filters used by Find tickets and Add matching tickets.</p>
                </div>
              </div>
              <div className="settings-form-grid">
                <label className="settings-field">
                  Cycle
                  <select value={settings.cycleScope} onChange={(event) => setSettings((current) => ({ ...current, cycleScope: event.target.value as UserSettings["cycleScope"] }))}>
                    <option value="upcoming">Upcoming cycle</option>
                    <option value="active">Active cycle</option>
                    <option value="any">Any cycle / backlog</option>
                  </select>
                </label>
                <label className="settings-field">
                  Estimates
                  <select value={settings.estimateScope} onChange={(event) => setSettings((current) => ({ ...current, estimateScope: event.target.value as UserSettings["estimateScope"] }))}>
                    <option value="unestimated">Unestimated only</option>
                    <option value="estimated">Estimated only</option>
                    <option value="any">Estimated or not</option>
                  </select>
                </label>
                <label className="settings-field">
                  Assignee
                  <select value={settings.assigneeScope} onChange={(event) => setSettings((current) => ({ ...current, assigneeScope: event.target.value as UserSettings["assigneeScope"] }))}>
                    <option value="anyone">Anyone</option>
                    <option value="me">Assigned to me</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </label>
              </div>
              <fieldset className="status-picker">
                <legend>Statuses</legend>
                {([
                  ["backlog", "Backlog"],
                  ["unstarted", "Todo"],
                  ["started", "In Progress"],
                ] as const).map(([value, label]) => (
                  <label key={value}>
                    <input
                      checked={settings.stateTypes.includes(value)}
                      onChange={(event) => {
                        setSettings((current) => {
                          const stateTypes = event.target.checked
                            ? [...current.stateTypes, value]
                            : current.stateTypes.filter((state) => state !== value);
                          return stateTypes.length ? { ...current, stateTypes } : current;
                        });
                      }}
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
            </section>

            <section className="settings-card" id="sorting">
              <div className="settings-card-heading">
                <span className="settings-icon dark"><ChevronDown size={18} /></span>
                <div>
                  <h2>Agenda order</h2>
                  <p>Apply a known sort on import, then drag any ticket for the final manual order.</p>
                </div>
              </div>
              <label className="settings-field">
                Default order
                <select value={settings.defaultSort} onChange={(event) => setSettings((current) => ({ ...current, defaultSort: event.target.value as QueueSortPreset }))}>
                  {sortOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <div className="custom-sort-builder">
                <div>
                  <b>Custom sort rules</b>
                  <small>Rules run top to bottom as tie-breakers.</small>
                </div>
                {settings.customSortRules.map((rule, index) => (
                  <div className="sort-rule" key={`${index}-${rule.field}`}>
                    <span>{index + 1}</span>
                    <select
                      value={rule.field}
                      onChange={(event) => setSettings((current) => ({
                        ...current,
                        customSortRules: current.customSortRules.map((candidate, candidateIndex) =>
                          candidateIndex === index ? { ...candidate, field: event.target.value as QueueSortField } : candidate,
                        ),
                      }))}
                    >
                      {sortFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select>
                    <select
                      value={rule.direction}
                      onChange={(event) => setSettings((current) => ({
                        ...current,
                        customSortRules: current.customSortRules.map((candidate, candidateIndex) =>
                          candidateIndex === index ? { ...candidate, direction: event.target.value as "asc" | "desc" } : candidate,
                        ),
                      }))}
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                    <button
                      aria-label={`Remove sort rule ${index + 1}`}
                      disabled={settings.customSortRules.length === 1}
                      onClick={() => setSettings((current) => ({ ...current, customSortRules: current.customSortRules.filter((_, candidateIndex) => candidateIndex !== index) }))}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {settings.customSortRules.length < 3 && (
                  <button
                    className="add-sort-rule"
                    onClick={() => setSettings((current) => ({ ...current, customSortRules: [...current.customSortRules, { field: "identifier", direction: "asc" }] }))}
                    type="button"
                  >
                    <Plus size={14} /> Add tie-breaker
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
