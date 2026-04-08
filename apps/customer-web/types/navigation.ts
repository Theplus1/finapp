import { PermissionEnum, RoleUserEnum } from "@/lib/api/endpoints/users";
import { LucideIcon } from "lucide-react";

export interface NavSection {
  title: string;
  url: string;
  icon: LucideIcon;
  roleAccept: RoleUserEnum[];
  permissionsAccept?: PermissionEnum[];
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
  visible?: boolean;
}
