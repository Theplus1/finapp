import {
  SquareTerminal,
  IdCard,
  HandCoins,
  BanknoteArrowDown,
  User,
} from "lucide-react";
import { NavSection } from "@/types";
import { RoleUserEnum } from "@/lib/api/endpoints/users";

export const navMain: NavSection[] = [
  {
    title: "Transactions",
    url: "/dashboard",
    icon: SquareTerminal,
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ADS, RoleUserEnum.ACCOUNTANT],
  },
  {
    title: "Card list",
    url: "/cards",
    icon: IdCard,
    roleAccept: [RoleUserEnum.BOSS],
  },
  {
    title: "Card",
    url: "/card",
    icon: IdCard,
    roleAccept: [RoleUserEnum.ADS],
  },
  {
    title: "Payments",
    url: "/payments",
    icon: HandCoins,
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ACCOUNTANT],
  },
  {
    title: "Card spend",
    url: "/card-spend",
    icon: BanknoteArrowDown,
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ACCOUNTANT],
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
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ADS, RoleUserEnum.ACCOUNTANT],
    visible: false,
  },
];
