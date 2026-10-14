import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReplyLane.si — Good conversations go places",
  description: "A thoughtful workspace for your Instagram conversations. Create keyword replies in your own words, test them, and keep every conversation moving.",
  applicationName: "ReplyLane.si",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
