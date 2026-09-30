import type { Metadata } from "next";
import "./globals.css";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Pointed",
    template: "%s · Pointed",
  },
  applicationName: "Pointed",
  description:
    "Run private pointing sessions on Linear issues. Discuss the result, then let the facilitator choose what to save.",
  icons: {
    icon: "/pointed-mark.svg",
    shortcut: "/pointed-mark.svg",
  },
  keywords: [
    "pointing poker",
    "planning poker",
    "Linear",
    "story points",
    "open source",
  ],
  openGraph: {
    title: "Pointed · Team estimates for Linear",
    description: "Bring issues into a shared room. Vote privately, discuss together, and let the facilitator confirm each estimate in Linear.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pointed · Team estimates for Linear",
    description: "Bring issues into a shared room. Vote privately, discuss together, and let the facilitator confirm each estimate in Linear.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-theme="light"
      data-theme-preference="system"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
