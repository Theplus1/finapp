"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavMain } from "@/components/navigation/nav-main";
import { SidebarAction } from "@/components/navigation/sidebar-action";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@repo/ui/components/sidebar";
import { navMain as navMainConfig } from "@/config/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Dynamically set isActive based on current pathname
  const navMainItems = React.useMemo(() => {
    if (typeof localStorage === "undefined" || !localStorage) return [];
    const { role } = JSON.parse(localStorage.getItem("user") ?? "{}");
    return navMainConfig
      .map((section) => ({
        ...section,
        isActive:
          section.items?.some((item) => pathname.startsWith(item.url)) ||
          pathname.startsWith(section.url),
      }))
      .filter((item) => item.roleAccept.includes(role));
  }, [pathname]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarAction />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenuButton isActive={true}>
          Timezone: <span>GMT+0</span>
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
