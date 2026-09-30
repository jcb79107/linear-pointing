"use client";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Monitor,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/Brand";
import { AccountDeletion } from "@/components/AccountDeletion";
import { SlackConnection } from "@/components/SlackConnection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TeamDefaultFields } from "@/components/TeamDefaultFields";
import type { LinearTeamSummary, TeamDefaults } from "@/lib/domain";
import { DEFAULT_TEAM_DEFAULTS } from "@/lib/team-defaults";
import { linearTeamEstimateCards } from "@/lib/estimates";
import {
  getServerThemePreference,
  readThemePreference,
  saveThemePreference,
  subscribeThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { requestJson } from "@/lib/client-request";
import { Palette } from "lucide-react";
const themeOptions = [
  {
    id: "system",
    name: "System",
    description: "Match this device",
    icon: Monitor,
  },
  {
    id: "light",
    name: "Light",
    description: "Always use light mode",
    icon: Sun,
  },
  {
    id: "dark",
    name: "Dark",
    description: "Always use dark mode",
    icon: Moon,
  },
] satisfies Array<{
  id: ThemePreference;
  name: string;
  description: string;
  icon: typeof Monitor;
}>;

export function SettingsClient({
  user,
  teams,
  initialDefaults,
  hasWriteScope,
  slackNotice,
}: {
  user: { name: string; email: string | null };
  teams: LinearTeamSummary[];
  initialDefaults: Record<string, TeamDefaults>;
  hasWriteScope: boolean;
  slackNotice?: string;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [savedDefaults, setSavedDefaults] = useState(initialDefaults);
  const [drafts, setDrafts] = useState(initialDefaults);
  const [saving, setSaving] = useState(false);
  const allowLeave = useRef(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const settings = drafts[teamId] ?? DEFAULT_TEAM_DEFAULTS;
  const dirty =
    JSON.stringify(settings) !==
    JSON.stringify(savedDefaults[teamId] ?? DEFAULT_TEAM_DEFAULTS);
  const anyDirty = teams.some(
    (team) =>
      JSON.stringify(drafts[team.id] ?? DEFAULT_TEAM_DEFAULTS) !==
      JSON.stringify(savedDefaults[team.id] ?? DEFAULT_TEAM_DEFAULTS),
  );
  const team = teams.find((team) => team.id === teamId);
  const themePreference = useSyncExternalStore(
    subscribeThemePreference,
    readThemePreference,
    getServerThemePreference,
  );
  function chooseTheme(value: ThemePreference) {
    saveThemePreference(value);
  }
  useEffect(() => {
    if (!anyDirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!allowLeave.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [anyDirty]);
  async function save() {
    if (saving || !teamId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data, response } = await requestJson<{
        settings: TeamDefaults;
        error?: string;
      }>(`/api/teams/${encodeURIComponent(teamId)}/defaults`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok)
        throw new Error(data.error ?? "Could not save team defaults");
      setDrafts((current) => ({ ...current, [teamId]: data.settings }));
      setSavedDefaults((current) => ({ ...current, [teamId]: data.settings }));
      setNotice(
        `Defaults saved for ${team?.name}. Existing sessions are unchanged.`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not save team defaults",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <main
      className="settings-shell"
      onClickCapture={(event) => {
        const anchor = (event.target as HTMLElement).closest("a");
        if (
          anyDirty &&
          anchor &&
          !anchor.getAttribute("href")?.startsWith("#")
        ) {
          event.preventDefault();
          event.stopPropagation();
          setLeaveTo(anchor.href);
        }
      }}
    >
      <header className="app-header settings-header">
        <Brand />
        <div className="settings-header-actions">
          <Link className="button button-ghost" aria-label="Sessions" href="/app">
            <ArrowLeft size={16} /> Sessions
          </Link>
          <button
            className="button button-primary"
            disabled={saving || !dirty || !teamId}
            onClick={save}
            type="button"
          >
            {saving ? "Saving…" : "Save team defaults"}
          </button>
        </div>
      </header>
      <section className="settings-main">
        <div className="settings-intro">
          <div>
            <p className="step-label">TEAM WORKFLOW</p>
            <h1>Pointing defaults</h1>
            <p>
              Set up the next session once. Your team can reuse these defaults.
            </p>
          </div>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <p className="prepare-save-status" role="status">
          {dirty
            ? `Unsaved changes for ${team?.name}`
            : anyDirty
              ? "Another team has unsaved changes"
              : notice}
        </p>
        <div className="settings-layout">
          <nav className="settings-nav" aria-label="Settings sections">
            <a href="#linear">Linear connection</a>
            <a href="#team">Team defaults</a>
            <a href="#slack">Slack</a>
            <a href="#appearance">Appearance</a>
            <a href="#account">Account data</a>
          </nav>
          <div className="settings-sections">
            <section className="settings-card" id="linear">
              <div className="settings-card-heading">
                <div>
                  <h2>Linear connection</h2>
                  <p>
                    {user.name} · {user.email ?? "Linear account"}
                  </p>
                </div>
                <span
                  className={`scope-badge ${hasWriteScope ? "ready" : "warning"}`}
                >
                  {hasWriteScope ? "Estimate saving enabled" : "Read only"}
                </span>
              </div>
              <div className="settings-inline-note">
                <p>
                  {hasWriteScope
                    ? "Estimates save to this Linear workspace."
                    : "Enable estimate saving to facilitate a session."}
                </p>
                <a
                  className="button button-ghost"
                  href="/api/auth/linear/start?write=true&returnTo=/app/settings"
                >
                  {hasWriteScope
                    ? "Switch Linear workspace"
                    : "Enable estimate saving"}
                  <ExternalLink size={14} />
                </a>
              </div>
            </section>
            <section className="settings-card" id="team">
              <div className="settings-card-heading">
                <div>
                  <h2>Team defaults</h2>
                  <p>
                    Shared with this Linear team. You can override them when
                    preparing a session.
                  </p>
                </div>
              </div>
              {team ? (
                <>
                  <label className="settings-field">
                    Linear team
                    <select
                      aria-label="Linear team"
                      disabled={saving}
                      value={teamId}
                      onChange={(e) => {
                        setTeamId(e.target.value);
                        setNotice(null);
                        setError(null);
                      }}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TeamDefaultFields
                    value={settings}
                    disabled={saving}
                    onChange={(value) =>
                      setDrafts((current) => ({ ...current, [teamId]: value }))
                    }
                  />
                  <p className="cycle-policy">
                    Unestimated tickets only. Completed and canceled work stays
                    out. “Next cycle” advances automatically for each new
                    agenda.
                  </p>
                  <p className="cycle-scale">
                    Linear estimate scale:{" "}
                    {linearTeamEstimateCards(team)
                      .map((card) => card.label)
                      .join(" · ")}
                  </p>
                  <p className="theme-save-note">
                    Save team defaults to apply these choices to new sessions.
                  </p>
                </>
              ) : (
                <p>
                  No teams with estimates enabled. Enable estimates in Linear,
                  then reload.
                </p>
              )}
            </section>
            <SlackConnection notice={slackNotice} />
            <section className="settings-card" id="appearance">
              <div className="settings-card-heading">
                <span className="settings-icon purple">
                  <Palette size={18} />
                </span>
                <div>
                  <h2>Appearance</h2>
                  <p>
                    Choose the color mode that works best in your workspace.
                  </p>
                </div>
              </div>
              <div
                className="theme-options"
                role="group"
                aria-label="Color mode"
              >
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = themePreference === option.id;

                  return (
                    <button
                      aria-pressed={selected}
                      className={`theme-option ${selected ? "selected" : ""}`}
                      key={option.id}
                      onClick={() => chooseTheme(option.id)}
                      type="button"
                    >
                      <span>
                        <Icon size={19} />
                      </span>
                      <b>{option.name}</b>
                      <small>{option.description}</small>
                      <i aria-hidden="true">
                        {selected && <Check size={13} />}
                      </i>
                    </button>
                  );
                })}
              </div>
              <p className="theme-save-note" aria-live="polite">
                {themePreference === "system"
                  ? "Following your device appearance. Changes are applied automatically."
                  : `${themePreference === "dark" ? "Dark" : "Light"} mode is active.`}
                <span> Saved on this device.</span>
              </p>
            </section>
            <AccountDeletion onDeleted={() => { allowLeave.current = true; }} />
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(leaveTo)}
        title="Leave without saving?"
        description="Your team defaults have unsaved changes."
        confirmLabel="Discard and leave"
        onCancel={() => setLeaveTo(null)}
        onConfirm={() => {
          if (leaveTo) {
            allowLeave.current = true;
            setDrafts(savedDefaults);
            window.location.assign(leaveTo);
          }
        }}
      />
    </main>
  );
}
