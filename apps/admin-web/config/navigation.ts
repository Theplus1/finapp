import {
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
  SquareTerminal,
  IdCard,
  Group,
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
    title: "Dashboard",
    url: "/dashboard",
    icon: SquareTerminal,
  },
  {
    title: "Virtual accounts",
    url: "/virtual-accounts",
    icon: User,
  },
  {
    title: "Card groups",
    url: "/card-groups",
    icon: Group,
  },
  {
    title: "Cards",
    url: "/cards",
    icon: IdCard,
  },
];
