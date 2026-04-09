import { formatUtcMMDDYYYYHHMM } from "@/app/utils/func";
import { api } from "@/lib/api";
import { Card } from "@/lib/api/endpoints/card";
import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Eye,
  Lock,
  LockOpen,
  DollarSign,
  Repeat,
  ShieldCheck,
  Activity,
} from "lucide-react";

type Props = {
  card: Card;
};

const limitQuery = 15;

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Eye; color: string; bg: string }> = {
  get_cvv: { label: "Get CVV", icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
  get_confirm_code: { label: "Get Confirm Code", icon: ShieldCheck, color: "text-sky-600", bg: "bg-sky-50" },
  lock_card: { label: "Locked", icon: Lock, color: "text-red-500", bg: "bg-red-50" },
  unlock_card: { label: "Unlocked", icon: LockOpen, color: "text-green-600", bg: "bg-green-50" },
  set_spending_limit: { label: "Set Limit", icon: DollarSign, color: "text-orange-500", bg: "bg-orange-50" },
  unset_spending_limit: { label: "Remove Limit", icon: DollarSign, color: "text-orange-400", bg: "bg-orange-50" },
  set_recurring_only: { label: "Recurring On", icon: Repeat, color: "text-purple-500", bg: "bg-purple-50" },
  unset_recurring_only: { label: "Recurring Off", icon: Repeat, color: "text-purple-400", bg: "bg-purple-50" },
};

const DEFAULT_CONFIG = { label: "Unknown", icon: Activity, color: "text-gray-500", bg: "bg-gray-50" };

type ActivityItem = {
  action: string;
  performedByUsername: string;
  performedAt: string;
  details?: Record<string, any>;
};

function groupByDate(items: ActivityItem[]): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const date = new Date(item.performedAt);
    const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

const CVVHistoriesTaken = ({ card }: Props) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    initialPageParam: 1 as number,
    queryKey: ["card-activity", card?.slashId, open],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.cards.getCardActivity(card!.slashId, {
        page: pageParam,
        limit: limitQuery,
      });
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (allPages.length >= (lastPage as any).totalPages) return undefined;
      return allPages.length + 1;
    },
    enabled: !!card && open,
  });

  useEffect(() => {
    if (!open) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetching) {
        fetchNextPage();
      }
    });
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetching, fetchNextPage, open]);

  const activities = data?.pages.flatMap((p) => (p as any).data) as ActivityItem[] | undefined;
  const totalCount = (data?.pages[0] as any)?.total ?? 0;
  const grouped = activities ? groupByDate(activities) : {};

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="link" className="tabular-nums">
          {totalCount || "View"}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Activity — {card.name || card.slashId}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground">
            {totalCount} total action{totalCount !== 1 ? "s" : ""}
          </p>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-6 max-h-[calc(85vh-80px)]">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-4">
              <div className="sticky top-0 z-10 bg-background py-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {date}
                </span>
              </div>

              <div className="relative ml-3 border-l border-border pl-4 space-y-2">
                {items.map((item, idx) => {
                  const cfg = ACTION_CONFIG[item.action] ?? DEFAULT_CONFIG;
                  const Icon = cfg.icon;
                  const time = new Date(item.performedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  });

                  return (
                    <div key={idx} className="relative flex items-start gap-3 group">
                      <div className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full border-2 border-background ${cfg.bg} ring-2 ring-border`} />

                      <div className={`flex-shrink-0 rounded-md p-1.5 ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-shrink-0">
                            {time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {item.performedByUsername}
                          </span>
                          {item.details && item.action === "set_spending_limit" && (
                            <span className="text-[11px] text-muted-foreground">
                              — ${item.details.amount} / {item.details.preset}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {isFetching && (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!isFetching && activities && activities.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              No activity yet
            </div>
          )}

          <div ref={loadMoreRef} className="h-1" />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default CVVHistoriesTaken;
