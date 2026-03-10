import {
  SquareTerminal,
  IdCard,
  HandCoins,
  BanknoteArrowDown,
  User,
} from "lucide-react";
import { NavSection } from "@/types";

export enum RoleUserEnum {
  BOSS = "boss",
  ADS = "ads",
  ACCOUNTANT = "accountant",
}

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
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ADS],
  },
  {
    title: "Payments",
    url: "/payments",
    icon: HandCoins,
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ACCOUNTANT],
  },
  {
    title: "Cards spend",
    url: "/cards-spend",
    icon: BanknoteArrowDown,
    roleAccept: [RoleUserEnum.BOSS, RoleUserEnum.ACCOUNTANT],
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: User,
    roleAccept: [RoleUserEnum.BOSS],
  },
];
