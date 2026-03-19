"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { RoleUserEnum } from "@/lib/api/endpoints/users";

export type FacebookVerifyNotificationPayload = {
  transactionId: string;
  virtualAccountId: string;
  amountCents: number;
  currency: string;
  cardId?: string;
  cardName?: string;
  merchantName?: string;
  description?: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string; // transactionId
  type: "facebookVerify";
  title: string;
  description?: string;
  createdAt: string;
  unread: boolean;
  payload: FacebookVerifyNotificationPayload;
};

type RealtimeNotificationsContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
};

const RealtimeNotificationsContext =
  createContext<RealtimeNotificationsContextValue | null>(null);

function getWsBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env && env.trim().length > 0) return env.trim().replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type StoredUser = {
  role?: RoleUserEnum | string;
  type?: string;
};

export function RealtimeNotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const markAsRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  useEffect(() => {
    // Chỉ bật realtime cho NV ads
    const user = safeParseJson<StoredUser>(localStorage.getItem("user"));
    const token = localStorage.getItem("auth_token");
    const isAds = user?.role === RoleUserEnum.ADS || user?.role === "ads";

    if (!isAds || !token) return;

    const wsBase = getWsBaseUrl();
    if (!wsBase) return;

    const socket = io(`${wsBase}/ws/customer`, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("transactions:facebookVerify:new", (payload: FacebookVerifyNotificationPayload) => {
      // Dedup theo transactionId
      setItems((prev) => {
        const title = `New transaction`;
        const descriptionCore =
          payload.cardName
            ? `${payload.cardName}${payload.merchantName ? ` • ${payload.merchantName}` : ""}`
            : payload.merchantName ?? payload.description;
        let description = `Transaction: ${payload.transactionId}`;
        if (descriptionCore) {
          description += ` • ${descriptionCore}`;
        }

        if (prev.some((n) => n.id === payload.transactionId)) {
          return prev.map((n) =>
            n.id === payload.transactionId
              ? {
                  ...n,
                  title,
                  description,
                  createdAt: payload.createdAt,
                  payload,
                  unread: true,
                }
              : n,
          );
        }

        const next: NotificationItem = {
          id: payload.transactionId,
          type: "facebookVerify",
          title,
          description,
          createdAt: payload.createdAt,
          unread: true,
          payload,
        };

        return [next, ...prev].slice(0, 50);
      });
    });

    socketRef.current = socket;

    return () => {
      socket.off("transactions:facebookVerify:new");
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const unreadCount = useMemo(
    () => items.reduce((acc, n) => acc + (n.unread ? 1 : 0), 0),
    [items],
  );

  const value: RealtimeNotificationsContextValue = useMemo(
    () => ({
      items,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [items, unreadCount, markAsRead, markAllAsRead, clearAll],
  );

  return (
    <RealtimeNotificationsContext.Provider value={value}>
      {children}
    </RealtimeNotificationsContext.Provider>
  );
}

export function useRealtimeNotifications(): RealtimeNotificationsContextValue {
  const ctx = useContext(RealtimeNotificationsContext);
  if (!ctx) {
    throw new Error("useRealtimeNotifications must be used within RealtimeNotificationsProvider");
  }
  return ctx;
}

