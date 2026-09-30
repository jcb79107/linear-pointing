import { QueueBuilder } from "@/components/QueueBuilder";
import { SettingsClient } from "@/components/SettingsClient";
import { DEFAULT_TEAM_DEFAULTS } from "@/lib/team-defaults";
// Copied into the isolated harness; fixture data never ships in the application.
// @ts-expect-error Only resolved inside the generated fixture app.
import { demoSnapshot } from "@/fixture";
import type { SessionSnapshot } from "@/lib/domain";
export default async function Fixture({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  const { screen } = await searchParams;
  const draft: SessionSnapshot = {
    ...demoSnapshot,
    status: "draft",
    activeItemId: null,
    round: null,
    defaults: DEFAULT_TEAM_DEFAULTS,
    queue: [],
  };
  const teams = ["team-a", "team-b"].map((id, index) => ({
    id,
    key: "API",
    name: index === 0 ? "Platform API" : "Product",
    issueEstimationType: "linear" as const,
    issueEstimationAllowZero: true,
    issueEstimationExtended: false,
  }));
  return (
    <>
      <aside aria-label="Preview environment" className="fixture-banner">
        Local preview · Synthetic tickets and accounts
      </aside>
      {screen === "settings" ? (
        <SettingsClient
          user={{ name: "Richard Hendricks", email: "richard@example.test" }}
          teams={teams}
          initialDefaults={{
            "team-a": DEFAULT_TEAM_DEFAULTS,
            "team-b": DEFAULT_TEAM_DEFAULTS,
          }}
          hasWriteScope={false}
        />
      ) : (
        <QueueBuilder
          initialSnapshot={draft}
          settings={DEFAULT_TEAM_DEFAULTS}
        />
      )}
    </>
  );
}
