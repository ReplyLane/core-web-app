import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Replylane — Instagram automations",
  description: "Turn Instagram comments into conversations with simple automations and clear pricing.",
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
