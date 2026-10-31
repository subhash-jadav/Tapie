import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tapie — make a mixtape for someone",
  description: "Turn your favourite YouTube songs into a custom cassette mixtape and share it with a link.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ead5" },
    { media: "(prefers-color-scheme: dark)", color: "#15110e" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render per request so Next.js can attach the CSP nonce from proxy.ts to its scripts.
  await connection();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // The boot script sets data-theme / theme colours on <html> before React hydrates.
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Constant script (no user data), allowed by the CSP nonce: applies the saved theme before first paint. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
