import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relay / Agent Console",
  description: "A resilient console for streaming agent sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
