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
    "Open-source pointing poker for Linear. Import issues, vote privately, and write estimates back.",
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
    title: "Pointed",
    description: "Pointing poker for Linear.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pointed",
    description: "Pointing poker for Linear.",
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
