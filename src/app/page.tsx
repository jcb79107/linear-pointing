import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/Brand";

const revealedVotes = [
  { initials: "RH", name: "Richard", vote: 3 },
  { initials: "DC", name: "Dinesh", vote: 4 },
  { initials: "BG", name: "Gilfoyle", vote: 4 },
];

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Brand />
        <Link className="landing-nav-link landing-how-link" href="#how-it-works">
          How it works
        </Link>
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
            Run the session together while each developer reads the issue on
            their own screen. Everyone votes privately and joins the discussion
            when the team is ready.
          </p>
          <div className="landing-primary-action">
            <Link className="button button-primary button-large" href="/app">
              Connect Linear <ArrowRight size={18} />
            </Link>
            <Link className="button button-ghost" href="/demo">
              Try the demo
            </Link>
          </div>
        </div>

        <section
          className="focused-product-demo"
          aria-label="Pointing session for the Platform API team"
        >
          <header className="focused-demo-bar">
            <div className="focused-live-status">
              <i />
              <span>Pointing session</span>
            </div>
            <span>Platform API</span>
          </header>

          <div className="focused-demo-issue">
            <div className="focused-issue-meta">
              <span>API-342</span>
              <i />
              <span>HIGH</span>
              <i />
              <span>TODO</span>
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
                <b>3/3 voted</b>
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
                <small>AVERAGE</small>
                <b>3.7</b>
              </span>
              <ArrowRight aria-hidden="true" size={18} />
              <span>
                <small>ESTIMATE</small>
                <b>4</b>
              </span>
            </div>
            <span className="landing-facilitator">Jared · Facilitator</span>
          </footer>
        </section>
      </section>

      <section
        className="landing-process"
        id="how-it-works"
        aria-labelledby="landing-process-title"
      >
        <div>
          <p className="landing-process-label">HOW A SESSION WORKS</p>
          <h2 id="landing-process-title">
            Read the issue on your own screen. Vote when you’re ready.
          </h2>
          <p>
            The facilitator moves the queue while teammates review each ticket
            at their own pace. Reveal votes together, then discuss the estimate.
          </p>
        </div>
        <ol className="landing-process-steps">
          <li>
            <span aria-hidden="true">01</span>
            <div>
              <h3>Bring in the issues</h3>
              <p>Choose a Linear team. New rooms use that team’s estimate scale.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">02</span>
            <div>
              <h3>Vote, then talk</h3>
              <p>Each developer reads and votes from their own screen.</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">03</span>
            <div>
              <h3>Discuss and estimate</h3>
              <p>Reveal together, settle on an estimate, and keep the session moving.</p>
            </div>
          </li>
        </ol>
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
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Help</Link>
        </nav>
      </footer>
    </main>
  );
}
