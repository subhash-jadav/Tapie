import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "tapie — make a mixtape for someone",
  description: "Turn your favourite YouTube songs into a custom cassette mixtape and share it with a link.",
};

export const viewport: Viewport = { themeColor: "#f4ead5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
