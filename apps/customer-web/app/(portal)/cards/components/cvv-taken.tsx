import { formatUtcMMDDYYYYHHMM } from "@/app/utils/func";
import { api } from "@/lib/api";
import { Card } from "@/lib/api/endpoints/card";
import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@repo/ui/components/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  card: Card;
};
const limitQuery = 5;

const CVVHistoriesTaken = ({ card }: Props) => {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [openCvvHistoryDetails, setOpenCvvHistoryDetails] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetching } = useInfiniteQuery({
    initialPageParam: 1 as number,
    queryKey: ["cvv-histories", card?.slashId, openCvvHistoryDetails],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.cards.getCardCVVHistory(card!.slashId, {
        page: pageParam,
        limit: limitQuery,
      });
      return response.data.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (
        (lastPage as unknown[]).length < limitQuery ||
        lastPage.length === card.cvvHistories.length
      )
        return undefined;
      return allPages.length + 1;
    },
    enabled: !!card && openCvvHistoryDetails,
  });

  useEffect(() => {
    if (!openCvvHistoryDetails) return;

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
  }, [hasNextPage, isFetching, fetchNextPage, openCvvHistoryDetails]);

  const cvvHistoriesData = data?.pages.flat() as
    | {
        revealedByUsername: string;
        revealedAt: string;
      }[]
    | undefined;
  return (
    <Popover
      open={openCvvHistoryDetails}
      onOpenChange={setOpenCvvHistoryDetails}
    >
      <PopoverTrigger>
        <Button variant={"link"}>{card.cvvHistories.length}</Button>
      </PopoverTrigger>
      <PopoverContent className="grid gap-3 max-h-[330px] overflow-y-auto">
        {cvvHistoriesData && cvvHistoriesData.length > 0 ? (
          cvvHistoriesData.map((item, index) => (
            <Item variant="outline" className="relative" key={index}>
              <ItemContent>
                <ItemTitle className="w-[100%] flex justify-between items-center">
                  <p className="text-md max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.revealedByUsername}{" "}
                  </p>
                  <div className="text-xs">
                    {formatUtcMMDDYYYYHHMM(item.revealedAt)}
                  </div>
                </ItemTitle>
              </ItemContent>
            </Item>
          ))
        ) : !isFetching ? (
          <div className="text-center">No CVV histories taken</div>
        ) : (
          <></>
        )}
        {isFetching && <div className="text-center">Loading history...</div>}
        {!hasNextPage &&
          !isFetching &&
          cvvHistoriesData &&
          cvvHistoriesData.length > 0 && (
            <div className="text-center text-muted-foreground">
              Full history
            </div>
          )}
        <div ref={loadMoreRef} />
      </PopoverContent>
    </Popover>
  );
};

export default CVVHistoriesTaken;
