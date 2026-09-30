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
  replaysOnErrorSampleRate: 0,
  beforeSendLog: () => null,
  beforeSendMetric: () => null,
  beforeSend: sanitizeSentryEvent,
  integrations: (defaults) => [
    ...defaults.filter((integration) => !["Breadcrumbs", "BrowserSession", "HttpContext"].includes(integration.name)),
    Sentry.feedbackIntegration({
      autoInject: false,
      showName: false,
      showEmail: true,
      isEmailRequired: false,
      enableScreenshot: false,
      useSentryUser: { name: "", email: "" },
      colorScheme: "system",
      formTitle: "Send feedback",
      submitButtonLabel: "Send feedback",
      emailLabel: "Email (optional, for a reply)",
      messageLabel: "What happened, or what would you change?",
      messagePlaceholder: "Please leave out private ticket content and credentials. Your message is sent to Pointed’s maintainer through Sentry.",
      successMessageText: "Thanks — your feedback was sent.",
    }),
  ],
});
// Feedback has its own event type and does not pass through beforeSend.
Sentry.addEventProcessor((event, hint) => sanitizeSentryEvent({
  ...event, tags: { ...event.tags, page: window.location.pathname },
}, hint));
