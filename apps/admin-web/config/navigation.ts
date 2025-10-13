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
    title: "Group card",
    url: "#",
    icon: Group,
    items: [
      {
        title: "Group card",
        url: "/group-card",
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
