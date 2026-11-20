import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SteadyGate™ v6.0 — Tremor-Compensated Assistive Smart Home",
  description: "Deterministic tremor-compensated hand-gesture smart-home controller and safety gate for motor impairments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
