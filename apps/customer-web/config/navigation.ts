import {
  SquareTerminal,
  IdCard,
  HandCoins,
  BanknoteArrowDown,
  User,
} from "lucide-react";
import { NavSection } from "@/types";
import { PermissionEnum, RoleUserEnum } from "@/lib/api/endpoints/users";

export const navMain: NavSection[] = [
  {
    title: "Transactions",
    url: "/dashboard",
    icon: SquareTerminal,
    roleAccept: [RoleUserEnum.BOSS],
    permissionsAccept: [PermissionEnum.TRANSACTIONS, PermissionEnum.TRANSACTIONS_FULL],
  },
  {
    title: "Card list",
    url: "/cards",
    icon: IdCard,
    roleAccept: [RoleUserEnum.BOSS],
    permissionsAccept: [PermissionEnum.CARD_LIST_OWN, PermissionEnum.CARD_LIST_ALL],
  },
  {
    title: "Payments",
    url: "/payments",
    icon: HandCoins,
    roleAccept: [RoleUserEnum.BOSS],
    permissionsAccept: [PermissionEnum.PAYMENTS],
  },
  {
    title: "Card spend",
    url: "/card-spend",
    icon: BanknoteArrowDown,
    roleAccept: [RoleUserEnum.BOSS],
    permissionsAccept: [PermissionEnum.CARD_SPEND],
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: User,
    roleAccept: [RoleUserEnum.BOSS],
  },
  {
    title: "Change password",
    url: "/change-password",
    icon: User,
    roleAccept: [RoleUserEnum.BOSS],
    permissionsAccept: [
      PermissionEnum.TRANSACTIONS,
      PermissionEnum.TRANSACTIONS_FULL,
      PermissionEnum.CARD_LIST_OWN,
      PermissionEnum.CARD_LIST_ALL,
      PermissionEnum.PAYMENTS,
      PermissionEnum.CARD_SPEND,
    ],
    visible: false,
  },
];
