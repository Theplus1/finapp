"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { navMain as navMainConfig } from "@/config/navigation";

export const SELECTED_VA_KEY = "selectedVaId";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  const [selectedVa, setSelectedVa] = React.useState<string>("");

  React.useEffect(() => {
    setMounted(true);
    const user = JSON.parse(localStorage.getItem("user") ?? "{}");
    const vaIds: string[] = user.virtualAccountIds ?? [];
    const vaId: string = user.virtualAccountId ?? "";

    // Init selected VA
    const saved = localStorage.getItem(SELECTED_VA_KEY);
    const validSaved = saved && vaIds.includes(saved) ? saved : vaId;
    if (validSaved) {
      setSelectedVa(validSaved);
      localStorage.setItem(SELECTED_VA_KEY, validSaved);
    }
  }, []);

  const user = React.useMemo(() => {
    if (!mounted) return {};
    return JSON.parse(localStorage.getItem("user") ?? "{}");
  }, [mounted]);

  const vaIds: string[] = user.virtualAccountIds ?? [];
  const isBoss = user.role === "boss";
  const hasMultipleVa = isBoss && vaIds.length > 1;

  const handleVaChange = (vaId: string) => {
    setSelectedVa(vaId);
    localStorage.setItem(SELECTED_VA_KEY, vaId);
    // Refresh current page to reload data
    router.refresh();
  };

  const navMainItems = React.useMemo(() => {
    if (!mounted) return [];
    const permissions: string[] = user.permissions ?? [];

    return navMainConfig
      .map((section) => ({
        ...section,
        isActive:
          section.items?.some((item) => pathname.startsWith(item.url)) ||
          pathname.startsWith(section.url),
      }))
      .filter((item) => {
        if (item.visible === false) return false;
        if (isBoss) return true;
        if (!item.permissionsAccept) return false;
        return item.permissionsAccept.some((p) => permissions.includes(p));
      });
  }, [mounted, pathname, user]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarAction />
      </SidebarHeader>
      <SidebarContent>
        {hasMultipleVa && (
          <div className="px-2 py-2">
            <Select value={selectedVa} onValueChange={handleVaChange}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select VA" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {vaIds.map((vaId) => (
                    <SelectItem key={vaId} value={vaId} className="text-xs">
                      {vaId}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
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
