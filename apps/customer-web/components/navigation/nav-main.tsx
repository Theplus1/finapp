"use client";

import { type LucideIcon } from "lucide-react";

import { CollapsibleTrigger } from "@repo/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@repo/ui/components/sidebar";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/components/tooltip";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <div key={item.title}>
            <Tooltip>
              <TooltipTrigger className="w-full">
                <SidebarMenuItem key={item.title}>
                  {item.items && item.items.length > 0 ? (
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <Link
                          href={item.url}
                          className="flex w-full items-center gap-2"
                        >
                          {item.icon && <item.icon size={16} />}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                  ) : (
                    <SidebarMenuButton asChild isActive={item.isActive}>
                      <Link
                        href={item.url}
                        className="flex w-full items-center gap-2"
                      >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </TooltipTrigger>
              <TooltipContent
                style={{
                  maxWidth: "120px",
                }}
              >
                {item.title}
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
