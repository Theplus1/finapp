import {
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  IdCard,
  Group,
  User,
} from "lucide-react";
import { NavSection, Project, Team } from "@/types";

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
    url: "#",
    icon: SquareTerminal,
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
      },
    ],
  },
  {
    title: "Card",
    url: "#",
    icon: IdCard,
    items: [
      {
        title: "Card",
        url: "/card",
      },
    ],
  },
  {
    title: "Group",
    url: "#",
    icon: Group,
    items: [
      {
        title: "Group",
        url: "/group",
      },
    ],
  },
  {
    title: "Virtual Account",
    url: "#",
    icon: User,
    items: [
      {
        title: "Virtual Account",
        url: "/virtual-account",
      },
    ],
  },
];
