"use client";

import dynamic from "next/dynamic";

const AppContent = dynamic(() => import("@/App"), { ssr: false });

export default function Page() {
  return <AppContent />;
}
