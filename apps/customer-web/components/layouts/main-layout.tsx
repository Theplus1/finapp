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
import { AdsTransactionAlert } from "@/components/notifications/ads-transaction-alert";
import { PermissionEnum, RoleUserEnum, UserBoss } from "@/lib/api/endpoints/users";
import { useEffect, useState } from "react";
import { ExportProvider } from "../export/ExportContext";
import { useExport } from "../export/useExport";
import { Spinner } from "@repo/ui/components/spinner";
import NoPermissionScreen from "@repo/ui/components/no-permission";
import { navMain } from "@/config/navigation";
import { usePathname } from "next/navigation";

interface MainLayoutProps {
  children: React.ReactNode;
}

const initUser: UserBoss = {
  id: "",
  username: "",
  role: RoleUserEnum.BOSS,
  email: "",
  isActive: false,
  bossId: "",
  virtualAccountId: "",
  createdAt: "",
  updatedAt: "",
};

export function MainLayout({ children }: MainLayoutProps) {
  const { breadcrumbs } = useBreadcrumbs();
  const [mounted, setMounted] = useState(false);
  const { isExporting, exportElement } = useExport();
  const [user, setUser] = useState<UserBoss>(initUser);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const userRaw = localStorage.getItem("user");
    if (!userRaw) return;
    setUser(JSON.parse(userRaw));
  }, []);

  const currentPath = pathname || "";

  const isBoss = user.role === RoleUserEnum.BOSS;
  const userPermissions: string[] = (user as any).permissions ?? [];

  const isNoPermission =
    mounted &&
    !!user.role &&
    !!currentPath &&
    !navMain.some((item) => {
      if (item.url !== currentPath) return false;
      if (isBoss) return true;
      if (!item.permissionsAccept) return false;
      return item.permissionsAccept.some((p) => userPermissions.includes(p));
    });

  const isAds = user.role === RoleUserEnum.ADS
    || (user.role === RoleUserEnum.EMPLOYEE && !userPermissions.includes(PermissionEnum.TRANSACTIONS_FULL) && userPermissions.includes(PermissionEnum.TRANSACTIONS));

  return (
    <ExportProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div>
              <div className="flex items-center gap-2 px-4">
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
            </div>
            {isExporting && (
              <div className="flex items-center gap-2 pe-3">
                <Spinner /> Exporting {exportElement || "data"}...
              </div>
            )}
            {mounted && isAds ? <AdsTransactionAlert /> : null}
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Toaster position="top-center" />
            {isNoPermission ? <NoPermissionScreen /> : children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ExportProvider>
  );
}
