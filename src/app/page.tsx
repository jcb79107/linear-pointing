import {
  ArrowRight,
  Check,
  Code2,
  ListChecks,
  MessageSquareText,
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
          <p className="eyebrow"><ListChecks size={14} /> BUILT FOR LINEAR GROOMING</p>
          <h1>
            Point the next cycle. <span>Keep the team moving.</span>
          </h1>
          <p>
            Pull a ready-to-groom queue from Linear, let everyone review at
            their own pace, reveal together, and write the final estimate back.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/demo">
              Try the interactive demo <ArrowRight size={18} />
            </Link>
            <Link className="landing-connect-link" href="/app">
              Connect your Linear workspace
            </Link>
          </div>
          <div className="landing-trust">
            <span><Check size={13} /> Free and open source</span>
            <span><Check size={13} /> Linear-only by design</span>
            <span><Check size={13} /> No Jira-shaped clutter</span>
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
                Review the Linear description, acceptance criteria, sub-issues,
                and linked Figma before pointing.
              </p>
              <div className="mock-tags"><span>4/4 ready</span><span>Figma</span></div>
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
        <article><ListChecks size={21} /><div><b>Prepare from Linear</b><p>Load the upcoming cycle and To-do tickets, then reorder the agenda.</p></div></article>
        <article><Users size={21} /><div><b>Review and point together</b><p>Each teammate reads the ticket and Figma on their own device before voting.</p></div></article>
        <article><MessageSquareText size={21} /><div><b>Decide and move on</b><p>Round up the team average, update Linear, and track time ticket by ticket.</p></div></article>
      </section>
    </main>
  );
}
