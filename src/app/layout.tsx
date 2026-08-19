import type { Metadata } from "next";
import "./globals.css";

import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "Linear Pointing",
    template: "%s · Linear Pointing",
  },
  description: "Linear-native planning poker with private team voting.",
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
