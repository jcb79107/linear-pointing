import {
  ArrowRight,
  Check,
  Code2,
  ListChecks,
  TimerReset,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/Brand";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <div className="nav-actions">
          <a
            className="button button-ghost"
            href="https://github.com/jcb79107/linear-pointing"
            rel="noreferrer"
            target="_blank"
          >
            <Code2 size={16} /> View source
          </a>
          <Link className="button button-dark" href="/app">
            Connect Linear <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><ListChecks size={14} /> LIGHTWEIGHT POINTING FOR LINEAR</p>
          <h1>
            Point issues. <span>Update Linear. Keep moving.</span>
          </h1>
          <p>
            Create a room from your next cycle, share one link, vote, and write
            the estimate back. No duplicate backlog. No meeting-suite bloat.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/app">
              Connect Linear <ArrowRight size={18} />
            </Link>
            <Link className="landing-connect-link" href="/setup">
              Self-host with your coding agent
            </Link>
          </div>
          <div className="landing-trust">
            <span><Check size={13} /> Free and open source</span>
            <span><Check size={13} /> Linear stays the source of truth</span>
            <span><Check size={13} /> Desktop and phone friendly</span>
          </div>
        </div>

        <div className="hero-product" aria-label="Product preview">
          <div className="product-topbar">
            <div><i className="live-dot" /> GROOMING LIVE</div>
            <span>3 / 8 decided · 14:32</span>
          </div>
          <div className="product-grid">
            <div className="mock-queue">
              <small>AGENDA</small>
              <div className="mock-ticket active">
                <span>API-342</span><b>Retry webhook deliveries</b><Check size={13} />
              </div>
              <div className="mock-ticket"><span>API-351</span><b>Workspace usage limits</b></div>
              <div className="mock-ticket"><span>API-355</span><b>Audit log CSV export</b></div>
            </div>
            <div className="mock-issue">
              <small>API-342 · HIGH · TODO</small>
              <h3>Retry failed webhook deliveries</h3>
              <p>
                Everyone can read the full Linear ticket and linked Figma on
                their own screen before voting.
              </p>
              <div className="mock-tags"><span>Figma attached</span></div>
              <div className="mock-cards">
                {[0, 1, 2, 3, 5].map((value) => (
                  <span className={value === 3 ? "selected" : ""} key={value}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
            <div className="mock-team">
              <small>ROOM</small>
              {["AK", "RL", "NS", "JM"].map((name, index) => (
                <div className="mock-person" key={name}>
                  <span>{name}</span><b>{["Ari", "Riley", "Nina", "Jason"][index]}</b>
                  <i className={index < 3 ? "done" : ""}>{index < 3 ? "✓" : "…"}</i>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="value-strip" aria-label="How it works">
        <article><ListChecks size={21} /><div><b>Start from Linear</b><p>Pull the upcoming cycle and Todo tickets, then set the meeting order.</p></div></article>
        <article><Users size={21} /><div><b>Review on any device</b><p>Each teammate gets the actual Linear issue and linked Figma on their own screen.</p></div></article>
        <article><TimerReset size={21} /><div><b>Vote, write back, next</b><p>Use the rounded-up team average, save it to Linear, and keep moving.</p></div></article>
      </section>
    </main>
  );
}
