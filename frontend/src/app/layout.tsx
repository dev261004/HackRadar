import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackRadar",
  description: "Discover hackathons, coding contests, AI competitions, and hiring challenges in one place."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
