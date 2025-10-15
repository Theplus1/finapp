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
    title: "Cards",
    url: "#",
    icon: IdCard,
    items: [
      {
        title: "Cards",
        url: "/cards",
      },
    ],
  },
  // {
  //   title: "Group cards",
  //   url: "#",
  //   icon: Group,
  //   items: [
  //     {
  //       title: "Group cards",
  //       url: "/group-cards",
  //     },
  //   ],
  // },
  {
    title: "Virtual accounts",
    url: "#",
    icon: User,
    items: [
      {
        title: "Virtual accounts",
        url: "/virtual-accounts",
      },
    ],
  },
];
