import * as Sentry from "@sentry/nextjs";
import { privateDataCollection, sanitizeSentryEvent } from "@/lib/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: privateDataCollection,
  tracePropagationTargets: [],
  sendClientReports: false,
  maxBreadcrumbs: 0,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  // Start/restart a local buffer automatically; beforeErrorSampling blocks error-triggered uploads.
  replaysOnErrorSampleRate: 1,
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
  beforeSend: sanitizeSentryEvent,
  integrations: (defaults) => [
    ...defaults.filter((integration) => !["Breadcrumbs", "BrowserSession", "HttpContext"].includes(integration.name)),
    Sentry.replayIntegration({
      maskAllText: false,
      maskAllInputs: true,
      blockAllMedia: true,
      stickySession: false,
      minReplayDuration: 0,
      networkDetailAllowUrls: [],
      networkCaptureBodies: false,
      beforeErrorSampling: () => false,
      // Keep the visual interaction recording, not console or network payloads.
      beforeAddRecordingEvent: () => null,
    }),
  ],
});
// Feedback has its own event type and does not pass through beforeSend.
Sentry.addEventProcessor((event, hint) => sanitizeSentryEvent({
  ...event, tags: { ...event.tags, page: window.location.pathname },
}, hint));

