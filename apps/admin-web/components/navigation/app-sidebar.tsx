"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavMain } from "@/components/navigation/nav-main";
import { SidebarAction } from "@/components/navigation/sidebar-action";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@repo/ui/components/sidebar";
import { navMain as navMainConfig } from "@/config/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  // Dynamically set isActive based on current pathname
  const navMainItems = navMainConfig.map((section) => ({
    ...section,
    isActive:
      section.items?.some((item) => pathname.startsWith(item.url)) ||
      pathname.startsWith(section.url),
  }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarAction />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
