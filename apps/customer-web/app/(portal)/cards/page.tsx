"use client";

import { useLayoutEffect, useState } from "react";
import { RoleUserEnum, UserBoss } from "@/lib/api/endpoints/users";
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
  const [user, setUser] = useState<UserBoss>(initEmployee);
  const isAds = user.role === RoleUserEnum.ADS;

  useLayoutEffect(() => {
    const userLocalStorage = localStorage.getItem("user");
    if (userLocalStorage) {
      setUser(JSON.parse(userLocalStorage));
    }
  }, []);

  if (isAds) {
    return <CardPage />;
  } else {
    return <CardsPage />;
  }
}
