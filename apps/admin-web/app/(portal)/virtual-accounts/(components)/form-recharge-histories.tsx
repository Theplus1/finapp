import {
  DataRechargeHistory,
  VirtualAccount,
} from "@/lib/api/endpoints/virtual-account";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import DepositHistoryItem from "./deposit-history-item";
import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";

type Props = {
  virtualAccount: VirtualAccount | null;
  countGetList: number;
  handleDrawerClose: () => void;
};

const limitQuery = 10;

const FormRechargeHistories = ({
  virtualAccount,
  countGetList,
  handleDrawerClose,
}: Props) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [countGetListState, setCountGetListState] = useState(countGetList);

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    initialPageParam: 1 as number,
    queryKey: ["daily-deposit", virtualAccount?.slashId, countGetListState],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.virtualAccounts.getDailyDeposit(
        virtualAccount!.slashId,
        {
          page: pageParam,
          limit: limitQuery,
        },
      );
      return response.data.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if ((lastPage as any).length < limitQuery) return undefined;
      return allPages.length + 1;
    },
    enabled: !!virtualAccount,
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const dailyDepositData = data?.pages.flat() as
    | DataRechargeHistory[]
    | undefined;

  return (
    <>
      <div className="max-h-[90vh] overflow-y-auto">
        <div className="px-4 grid grid-cols-1 gap-6">
          {(dailyDepositData as DataRechargeHistory[] | undefined)?.map(
            (item) => (
              <DepositHistoryItem
                key={item.id}
                virtualAccountId={virtualAccount!.slashId}
                item={item}
                onDeleteSuccess={() => {
                  setCountGetListState((prev) => prev + 1);
                }}
              />
            ),
          )}
        </div>
        <div ref={loadMoreRef} />
        {isFetching && <div className="px-4">Loading history...</div>}
        {!hasNextPage && !isFetching && (
          <div className="text-center text-muted-foreground my-3">
            Full history
          </div>
        )}
      </div>

      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button onClick={handleDrawerClose}>Close</Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormRechargeHistories;
