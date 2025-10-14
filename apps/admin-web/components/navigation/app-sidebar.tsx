"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { NavMain } from "@/components/navigation/nav-main";
// import { NavUser } from "@/components/navigation/nav-user";
import { TeamSwitcher } from "@/components/navigation/team-switcher";
import {
  Sidebar,
  SidebarContent,
  // SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { teams, navMain as navMainConfig } from "@/config/navigation";

// This is sample data - replace with actual user data from auth
// const userData = {
//   name: "shadcn",
//   email: "m@example.com",
//   avatar: "/avatars/shadcn.jpg",
// };

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
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      {/* <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}
