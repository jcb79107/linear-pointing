import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  SkipForward,
} from "lucide-react";
import Link from "next/link";

import { Brand, PointedMark } from "@/components/Brand";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="nav-actions">
          <a
            className="landing-nav-link"
            href="https://github.com/jcb79107/linear-pointing"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <Link className="landing-nav-link" href="/setup">
            Self-host
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">POINTING POKER FOR LINEAR</p>
          <h1>Point Linear issues with your team.</h1>
          <p className="landing-summary">
            Build the queue from Linear, share the room, and write each
            estimate back.
          </p>
          <div className="landing-primary-action">
            <Link className="button button-primary button-large" href="/app">
              Connect Linear <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="actual-product-preview" aria-label="Pointed room preview">
          <header className="actual-preview-header">
            <span className="actual-preview-mark"><PointedMark size={18} /></span>
            <div className="actual-preview-title">
              <b>API grooming · July 30</b>
              <small><i /> Live session</small>
            </div>
            <div className="actual-preview-progress">
              <span>0 / 3 decided</span>
              <i />
              <span>Total 14:03</span>
            </div>
            <div className="actual-preview-header-actions">
              <span><Copy size={12} /> Copy link</span>
              <span>Finish for now</span>
            </div>
          </header>

          <div className="actual-preview-grid">
            <aside className="actual-preview-agenda">
              <div className="actual-pane-heading"><span>AGENDA</span><b>3</b></div>
              <div className="actual-ticket active">
                <span>01</span>
                <div><b>Retry failed webhook deliveries</b><small>API-342 · 4:03</small></div>
                <i />
              </div>
              <div className="actual-ticket">
                <span>02</span>
                <div><b>Add workspace usage limits</b><small>API-351</small></div>
              </div>
              <div className="actual-ticket">
                <span>03</span>
                <div><b>Audit log CSV export</b><small>API-355</small></div>
              </div>
              <small className="actual-agenda-footer">Platform API · 0 · 1 · 2 · 3 · 4</small>
            </aside>

            <section className="actual-preview-issue">
              <div className="actual-issue-scroll">
                <div className="actual-issue-meta">
                  <span>API-342</span><i /> <span>HIGH</span><i /> <span>TODO</span>
                  <small>Open in Linear ↗</small>
                </div>
                <h2>Retry failed webhook deliveries</h2>
                <div className="actual-issue-tags">
                  <span className="project">Project · API reliability</span>
                  <span>Backend</span>
                  <span>Owner · Ari Kim</span>
                </div>
                <p>
                  Add exponential backoff for failed webhook deliveries and
                  show the latest delivery status to workspace admins.
                </p>
                <h3>Acceptance criteria</h3>
                <ul>
                  <li>Retry on 429 and 5xx responses</li>
                  <li>Cap retries after 24 hours</li>
                  <li>Show the next retry time in the delivery log</li>
                </ul>
              </div>
              <footer className="actual-round-bar">
                <div><Eye size={14} /><span><b>Watching this round</b><small>You facilitate; the team points.</small></span></div>
                <small>ROUND 1 · 1/3 VOTED · ISSUE 4:03</small>
              </footer>
            </section>

            <aside className="actual-preview-room">
              <div className="actual-pane-heading"><span>ROOM</span><b>4</b></div>
              <div className="actual-room-list">
                {["Ari Kim", "Riley Lee", "Nina Singh", "Jason Miller"].map((name, index) => (
                  <div className="actual-person" key={name}>
                    <span>{name.split(" ").map((part) => part[0]).join("")}</span>
                    <div><b>{name}</b><small>{index === 3 ? "Facilitator" : "Voter"}</small></div>
                    <i className={index === 1 ? "voted" : ""}>{index === 1 ? <Check size={12} /> : index === 3 ? <Eye size={12} /> : "…"}</i>
                  </div>
                ))}
              </div>
              <div className="actual-room-controls">
                <span className="actual-reveal"><Eye size={13} /> Reveal early</span>
                <span className="actual-skip"><SkipForward size={12} /> Skip ticket</span>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
