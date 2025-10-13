"use client"

import { useEffect } from "react"
import { useBreadcrumbs } from "@/contexts/breadcrumb-context"

export default function Page() {
  const { setBreadcrumbs } = useBreadcrumbs()

  useEffect(() => {
    setBreadcrumbs([
      { label: "Settings" },
    ])
  }, [setBreadcrumbs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <div className="bg-muted/50 rounded-xl p-6">
        <p>Settings content goes here...</p>
      </div>
    </div>
  )
}
