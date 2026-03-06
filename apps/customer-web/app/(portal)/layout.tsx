import { BreadcrumbProvider } from "@/contexts/breadcrumb-context"
import { MainLayout } from "@/components/layouts/main-layout"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BreadcrumbProvider>
      <MainLayout>{children}</MainLayout>
    </BreadcrumbProvider>
  )
}
