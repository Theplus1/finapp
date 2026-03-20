"use client";

import { Suspense } from "react";
import { Spinner } from "@repo/ui/components/spinner";
import DashboardContainer from "./components/dashboard-container";

export default function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <DashboardContainer />
    </Suspense>
  );
}
