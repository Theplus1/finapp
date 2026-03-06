import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  SquareTerminal,
  IdCard,
  HandCoins,
  BanknoteArrowDown,
  User,
} from "lucide-react";
import { NavSection, Team } from "@/types";

export const teams: Team[] = [
  {
    name: "Acme Inc",
    logo: GalleryVerticalEnd,
    plan: "Enterprise",
  },
  {
    name: "Acme Corp.",
    logo: AudioWaveform,
    plan: "Startup",
  },
  {
    name: "Evil Corp.",
    logo: Command,
    plan: "Free",
  },
];

export const navMain: NavSection[] = [
  {
    title: "Transactions",
    url: "/dashboard",
    icon: SquareTerminal,
  },
  {
    title: "Card list",
    url: "/cards",
    icon: IdCard,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: HandCoins,
  },
  {
    title: "Cards spend",
    url: "/cards-spend",
    icon: BanknoteArrowDown,
  },
  {
    title: "Accounts",
    url: "/accounts",
    icon: User,
  },
];
