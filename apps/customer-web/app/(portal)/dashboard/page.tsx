"use client";

import { Suspense } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import { useSearchParams } from "next/navigation";
import DashboardContainer from "./components/dashboard-container";

export default function Dashboard() {
  const searchParams = useSearchParams();

  const realtimeKey = searchParams.get("t") ?? "";
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardContainer realtimeKey={realtimeKey} />
    </Suspense>
  );
}
