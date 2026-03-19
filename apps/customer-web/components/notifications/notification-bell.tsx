"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";
import { useRealtimeNotifications } from "@/contexts/realtime-notifications-context";

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const { items, unreadCount, markAllAsRead, markAsRead, clearAll } = useRealtimeNotifications();

  const hasItems = items.length > 0;
  const topItems = useMemo(() => items.slice(0, 10), [items]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-[10px] leading-5 text-white text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-80">
        {!hasItems ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Chưa có thông báo</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-sm font-medium">Thông báo</div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => markAllAsRead()}
                  type="button"
                >
                  Đã đọc hết
                </button>
                <button
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => clearAll()}
                  type="button"
                >
                  Xoá
                </button>
              </div>
            </div>
            <div className="h-px bg-border" />
            {topItems.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer flex flex-col items-start gap-0.5 py-2"
                onClick={() => {
                  markAsRead(n.id);
                  // Điều hướng sang trang list transaction (dashboard) và reload list bằng cách đổi search param
                  const url = `/dashboard?rt=${encodeURIComponent(n.id)}&t=${Date.now()}`;
                  if (pathname !== "/dashboard") {
                    router.push(url);
                  } else {
                    router.replace(url);
                  }
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {n.title}
                    {n.unread ? <span className="ml-2 text-xs text-red-600">• mới</span> : null}
                  </div>
                </div>
                {n.description ? (
                  <div className="text-xs text-muted-foreground line-clamp-2">{n.description}</div>
                ) : null}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

