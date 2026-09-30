"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FeedbackButton } from "@/components/FeedbackButton";
import { Brand } from "@/components/Brand";
import type {
  LinearTeamSummary,
  SessionStatus,
  UserSettings,
} from "@/lib/domain";


interface SessionListItem {
  id: string;
  code: string;
  title: string;
  teamName: string;
  status: SessionStatus;
  updatedAt: string;
  activeQueueItemId: string | null;
  issueCount: number;
}

interface DashboardClientProps {
  user: { name: string; avatarUrl: string | null };
  teams: LinearTeamSummary[];
  settings: UserSettings;
  initialSessions: SessionListItem[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function suggestedSessionTitle() {
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date());
  return `Grooming · ${date}`;
}

export function DashboardClient({
  user,
  teams,
  initialSessions,
}: DashboardClientProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createSession() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, teamId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.upgradeUrl) {
          window.location.href = result.upgradeUrl;
          return;
        }
        throw new Error(result.error ?? "Could not create session");
      }
      router.push(`/app/sessions/${result.session.id}/prepare`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create session",
      );
      setBusy(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <Brand />
        <div className="header-user">
          <FeedbackButton compact />
          <span>{initials(user.name)}</span>
          <div>
            <b>{user.name}</b>
            <small>Linear connected</small>
          </div>
          <Link aria-label="Settings" className="header-icon-link" href="/app/settings">
            <Settings size={16} />
          </Link>
          <form noValidate action="/api/auth/logout" method="post">
            <button aria-label="Sign out" type="submit">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </header>

      <section className="dashboard-main">
        <div className="dashboard-welcome">
          <div>
            <p className="step-label">LINEAR PLANNING POKER</p>
            <h1>Pointing sessions</h1>
            <p>Create a session, choose its Linear tickets, and share the link.</p>
          </div>
          {!creating && <button
            className="button button-primary button-large"
            onClick={() => {
              setTitle(suggestedSessionTitle());
              setCreating(true);
            }}
            type="button"
          >
            <Plus size={18} /> New session
          </button>}
        </div>

        {creating && (
          <form noValidate
            className="new-session-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void createSession();
            }}
          >
            <div className="panel-intro">
              <div>
                <b>New session</b>
                <p>
                  Choose a team, then preview its cycle agenda. Estimates use the team’s Linear scale.
                </p>
              </div>
            </div>
            <label>
              Session name
              <input
                autoFocus
                onChange={(event) => setTitle(event.target.value)}
                placeholder={suggestedSessionTitle()}
                value={title}
              />
            </label>
            {teams.length > 0 ? (
              <label>
                Linear team
                <div className="select-wrap">
                  <select
                    onChange={(event) => setTeamId(event.target.value)}
                    value={teamId}
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </label>
            ) : (
              <div className="form-error">
                No teams with estimates enabled were found. Turn on estimates
                in a Linear team’s settings, then reconnect.
              </div>
            )}
            {error && <div className="form-error">{error}</div>}
            <div className="panel-actions">
              <button
                className="button button-ghost"
                onClick={() => setCreating(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-dark"
                disabled={!title.trim() || !teamId || busy}
                type="submit"
              >
                {busy ? "Creating…" : "Preview agenda"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        <section className="session-section">
          <div className="section-heading">
            <h2>Your sessions</h2>
            <span>{initialSessions.length} total</span>
          </div>
          {initialSessions.length === 0 && !creating ? (
            <div className="empty-sessions">
              <CircleDot size={24} />
              <b>No pointing sessions yet</b>
              <p>Create a session, pull in Linear tickets, and share the room.</p>
              <button
                className="button button-ghost"
                onClick={() => {
                  setTitle(suggestedSessionTitle());
                  setCreating(true);
                }}
                type="button"
              >
                <Plus size={15} /> Create your first session
              </button>
            </div>
          ) : (
            <div className="session-list">
              {initialSessions.map((session) => {
                const destination =
                  session.status === "draft"
                    ? `/app/sessions/${session.id}/prepare`
                    : `/sessions/${session.id}`;
                return (
                  <Link
                    className="session-row"
                    href={destination}
                    key={session.id}
                  >
                    <span className={`session-status ${session.status}`}>
                      {session.status === "live" ? (
                        <CircleDot size={15} />
                      ) : session.status === "ended" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Clock3 size={15} />
                      )}
                    </span>
                    <div className="session-info">
                      <b>{session.title}</b>
                      <span>
                        {session.teamName} · {session.issueCount}{" "}
                        {session.issueCount === 1 ? "issue" : "issues"}
                      </span>
                    </div>
                    <div className="session-meta">
                      <CalendarDays size={14} />
                      {new Intl.DateTimeFormat("en", {
                        month: "short",
                        day: "numeric",
                      }).format(new Date(session.updatedAt))}
                    </div>
                    <span className="session-open">
                      {session.status === "draft" ? "Prepare" : "Open"}
                      <ArrowRight size={15} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
