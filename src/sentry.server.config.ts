import * as Sentry from "@sentry/nextjs";
import { privateDataCollection, sanitizeSentryEvent } from "@/lib/sentry-privacy";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  dataCollection: privateDataCollection,
  tracePropagationTargets: [],
  sendClientReports: false,
  maxBreadcrumbs: 0,
  tracesSampleRate: 0,
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
  beforeSend: sanitizeSentryEvent,
});
