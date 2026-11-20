"use client";

import dynamic from "next/dynamic";

const DesignSystemDemo = dynamic(() => import("@/components/ui/DesignSystemDemo"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading design system...</div>,
});

export default function DesignSystemPage() {
  return (
    <DesignSystemDemo />
  );
}