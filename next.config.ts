import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default withSentryConfig(nextConfig, {
  org: "jason-baer",
  project: "pointed",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
