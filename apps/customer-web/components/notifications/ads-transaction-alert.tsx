"use client";

import { useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { X } from "lucide-react";
import { useRealtimeNotifications } from "@/contexts/realtime-notifications-context";
import type { NotificationItem } from "@/contexts/realtime-notifications-context";

function getReloadUrl(transactionId: string) {
  // `t` là key để dashboard refetch lại list
  return `/dashboard?rt=${encodeURIComponent(transactionId)}&t=${Date.now()}`;
}

export function AdsTransactionAlert() {
  const router = useRouter();
  const pathname = usePathname();
  const { latest, open, close, clear, actFacebookVerify } =
    useRealtimeNotifications();

  const content: NotificationItem | null = useMemo(() => {
    if (!open) return null;
    return latest;
  }, [latest, open]);

  if (!content) return null;

  const isOnTransactionsPage = pathname === "/dashboard";
  const displayDescription = isOnTransactionsPage
    ? content.description?.replace(/\nYes\s*\/\s*No\s*$/i, "\nYes")
    : content.description;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24"
      role="alertdialog"
      aria-modal="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-lg rounded-lg bg-background p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{content.title}</div>
            {displayDescription ? (
              <div className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                {displayDescription}
              </div>
            ) : null}
          </div>
          {!isOnTransactionsPage ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                actFacebookVerify({
                  transactionId: content.id,
                  action: "cancel",
                });
                close();
              }}
              aria-label="Close"
            >
              <X />
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {!isOnTransactionsPage ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                actFacebookVerify({
                  transactionId: content.id,
                  action: "cancel",
                });
                close();
              }}
            >
              No
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              actFacebookVerify({
                transactionId: content.id,
                action: "confirm",
              });
              const url = getReloadUrl(content.id);
              clear();
              if (!isOnTransactionsPage) {
                router.push(url);
              } else {
                // Đang ở dashboard => chỉ cập nhật query để dashboard refetch,
                // tránh điều hướng "đi trang khác".
                router.replace(url, { scroll: false });
              }
            }}
          >
            Yes
          </Button>
        </div>
      </div>
    </div>
  );
}

