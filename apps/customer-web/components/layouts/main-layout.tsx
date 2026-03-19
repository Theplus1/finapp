"use client";

import { AppSidebar } from "@/components/navigation/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { Separator } from "@repo/ui/components/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { Toaster } from "@repo/ui/components/sonner";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { RoleUserEnum } from "@/lib/api/endpoints/users";
import { useEffect, useState } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { breadcrumbs } = useBreadcrumbs();
  const [isAds, setIsAds] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;
    try {
      const parsed = JSON.parse(user) as { role?: RoleUserEnum };
      setIsAds(parsed.role === RoleUserEnum.ADS);
    } catch {
      // ignore
    }
  }, []);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 cursor-pointer" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              {breadcrumbs.length > 0 && (
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                        <BreadcrumbItem
                          className={index === 0 ? "hidden md:block" : ""}
                        >
                          {crumb.href ? (
                            <BreadcrumbLink href={crumb.href}>
                              {crumb.label}
                            </BreadcrumbLink>
                          ) : (
                            <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
            </div>

            {isAds ? (
              <div className="flex items-center">
                <NotificationBell />
              </div>
            ) : null}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Toaster position="top-center" />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
