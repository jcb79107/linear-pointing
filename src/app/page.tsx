import { ArrowRight, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

import { Brand, PointedMark } from "@/components/Brand";

const revealedVotes = [
  { initials: "AK", name: "Ari", vote: 3 },
  { initials: "RL", name: "Riley", vote: 5 },
  { initials: "NS", name: "Nina", vote: 5 },
  { initials: "JM", name: "Jason", vote: 4 },
];

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
            Everyone votes. Pointed averages the result, rounds up, and updates
            the issue in Linear.
          </p>
          <div className="landing-primary-action">
            <Link className="button button-primary button-large" href="/app">
              Connect Linear <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <section
          className="focused-product-demo"
          aria-label="A completed pointing round in Pointed"
        >
          <header className="focused-demo-bar">
            <div className="focused-live-status">
              <i />
              <span>Live session</span>
            </div>
            <span>Issue 04:03</span>
          </header>

          <div className="focused-demo-issue">
            <div className="focused-issue-meta">
              <span>API-342</span>
              <i />
              <span>HIGH</span>
              <i />
              <span>TODO</span>
              <a
                href="https://linear.app"
                rel="noreferrer"
                target="_blank"
              >
                Open in Linear <ExternalLink size={12} />
              </a>
            </div>
            <h2>Retry failed webhook deliveries</h2>
            <p>
              Add exponential backoff for failed webhook deliveries and show
              the latest delivery status to workspace admins.
            </p>
          </div>

          <div className="focused-round">
            <div className="focused-round-heading">
              <div>
                <span>Votes revealed</span>
                <b>4/4 voted</b>
              </div>
              <small>Round 1</small>
            </div>

            <div className="focused-votes">
              {revealedVotes.map((person) => (
                <div className="focused-voter" key={person.name}>
                  <span className="focused-avatar">{person.initials}</span>
                  <b>{person.name}</b>
                  <strong>{person.vote}</strong>
                </div>
              ))}
            </div>
          </div>

          <footer className="focused-result">
            <div className="focused-result-math">
              <span>
                <small>TEAM AVERAGE</small>
                <b>4.25</b>
              </span>
              <ArrowRight aria-hidden="true" size={18} />
              <span>
                <small>FINAL ESTIMATE</small>
                <b>5</b>
              </span>
            </div>
            <div className="focused-linear-confirmation">
              <span>
                <Check size={14} />
              </span>
              <div>
                <b>Saved to Linear</b>
                <small>API-342 · 5 points</small>
              </div>
            </div>
          </footer>
        </section>
      </section>

      <section className="landing-origin">
        <PointedMark className="landing-origin-mark" size={88} />
        <div>
          <h2>Grooming already lives in Linear.</h2>
          <p>
            Pointed only adds the part Linear is missing: private team voting
            and a shared estimate.
          </p>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <Brand />
          <p>Open-source pointing poker for Linear.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a
            href="https://github.com/jcb79107/linear-pointing"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <Link href="/setup">Self-host</Link>
        </nav>
      </footer>
    </main>
  );
}
