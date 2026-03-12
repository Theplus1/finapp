"use client";

import * as React from "react";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { upperCaseFirstCharacter } from "@repo/ui/lib/func";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/sidebar";
import { AudioWaveform } from "lucide-react";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { User } from "@/lib/api/endpoints/auth";
import { RoleUserEnum } from "@/lib/api/endpoints/users";

const initUser: User = {
  role: RoleUserEnum.BOSS,
  username: "",
  id: "",
  name: "",
  email: "",
  createdAt: "",
};

export function SidebarAction() {
  const { isMobile } = useSidebar();
  const [user, setUser] = React.useState<User>(initUser);

  React.useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("user") || `${JSON.stringify(initUser)}`,
    );
    setUser(user);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <AudioWaveform className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {user.username || EMPTY_LABEL}
                </span>
                <span className="truncate text-xs">
                  {upperCaseFirstCharacter(user.role) || EMPTY_LABEL}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuItem
              className="gap-2 p-2 cursor-pointer"
              onClick={handleLogout}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <LogOut className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium cursor-pointer">
                Logout
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
