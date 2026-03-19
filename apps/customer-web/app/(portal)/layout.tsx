import { BreadcrumbProvider } from "@/contexts/breadcrumb-context"
import { RealtimeNotificationsProvider } from "@/contexts/realtime-notifications-context"
import { MainLayout } from "@/components/layouts/main-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BreadcrumbProvider>
      <RealtimeNotificationsProvider>
        <MainLayout>{children}</MainLayout>
      </RealtimeNotificationsProvider>
    </BreadcrumbProvider>
  )
}
