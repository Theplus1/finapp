"use client";

import { useLayoutEffect, useState } from "react";
import { PermissionEnum, RoleUserEnum, UserBoss } from "@/lib/api/endpoints/users";
import CardPage from "../(card)/page";
import CardsPage from "./components/cards-page";

const initEmployee: UserBoss = {
  id: "",
  username: "",
  role: RoleUserEnum.BOSS,
  email: "",
  isActive: false,
  bossId: "",
  virtualAccountId: "",
  createdAt: "",
  updatedAt: "",
};

export default function Cards() {
  const [user, setUser] = useState<UserBoss & { permissions?: string[] }>(initEmployee);

  useLayoutEffect(() => {
    const userLocalStorage = localStorage.getItem("user");
    if (userLocalStorage) {
      setUser(JSON.parse(userLocalStorage));
    }
  }, []);

  const isBoss = user.role === RoleUserEnum.BOSS;
  const permissions = user.permissions ?? [];
  const canSeeAll = isBoss || permissions.includes(PermissionEnum.CARD_LIST_ALL);

  if (canSeeAll) {
    return <CardsPage />;
  } else {
    return <CardPage />;
  }
}
