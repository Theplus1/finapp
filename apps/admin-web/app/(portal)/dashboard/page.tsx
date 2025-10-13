"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  formatDatetimeMMDDYYYY,
  formatDollarByCent,
  renderNoTable,
} from "@/app/utils/func";
import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import {
  Section,
  SectionContent,
  SectionHeader,
  SectionTitle,
} from "@/components/layouts/section";
import { DataTable } from "@/components/ui/data-table";
import { Transition } from "@/lib/api/endpoints/transaction";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { CursorPagination } from "@/components/ui/cursor-pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/lib/api/endpoints/card";
import FilterTransaction from "./components/filter";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

const initFilter = {
  "filter:cardId": "",
  "filter:virtualAccountId": "",
  cursor: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Transition[];
const initCursorMap = {
  1: "",
};
export default function Dashboard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(0);
  const [cursorMap, setCursorMap] =
    useState<Record<number, string>>(initCursorMap);
  const [nextCursor, setNextCursor] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState(initFilter);
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page, currentFilter],
    queryFn: async () => {
      const currentCursor = cursorMap[page] ?? "";
      const res = await api.transactions.getTransactions({
        ...currentFilter,
        cursor: currentCursor,
      });
      const { nextCursor, count } = res.data.metadata;
      setNextCursor(nextCursor);
      if (!pageSize) {
        setPageSize(count);
      }
      setCursorMap((prev) => ({
        ...prev,
        [page + 1]: nextCursor as string,
      }));
      return res.data;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataTransaction: Transition[] = useMemo(
    () => data?.items ?? [],
    [data]
  );
  const dataTransactionTable = useMemo(() => {
    if (isLoading) return maskDataTable;
    return dataTransaction;
  }, [dataTransaction, isLoading]);

  const uniqueCardIds: string[] = useMemo(() => {
    const cardIds = dataTransaction.reduce((acc, item) => {
      if (item.cardId && !acc.includes(item.cardId)) {
        acc.push(item.cardId);
      }
      return acc;
    }, [] as string[]);
    return cardIds;
  }, [dataTransaction]);

  const { data: cardInfos, isLoading: isLoadingCardInfos } = useQuery({
    queryKey: ["card-infos", uniqueCardIds],
    queryFn: async () => {
      const results = await Promise.all(
        uniqueCardIds.map(async (id) => {
          const cachedCardInfo = queryClient.getQueryData<Card>([
            "card-infos",
            id,
          ]);
          if (cachedCardInfo) {
            return { data: cachedCardInfo };
          }
          const { data } = await api.cards.getCardById(id);
          queryClient.setQueryData(["card-infos", id], data);
          return { data };
        })
      );
      return results.map((r) => {
        return r.data;
      });
    },
    enabled: !!uniqueCardIds.length,
  });

  const uniqueVirtualAccountIds: string[] = useMemo(() => {
    const virtualAccountIds = dataTransaction.reduce((acc, item) => {
      if (item.virtualAccountId && !acc.includes(item.virtualAccountId)) {
        acc.push(item.virtualAccountId);
      }
      return acc;
    }, [] as string[]);
    return virtualAccountIds;
  }, [dataTransaction]);

  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos", uniqueVirtualAccountIds],
      queryFn: async () => {
        const results = await Promise.all(
          uniqueVirtualAccountIds.map(async (id) => {
            const cachedVirtualAccountInfo =
              queryClient.getQueryData<VirtualAccount>([
                "virtual-account-infos",
                id,
              ]);
            if (cachedVirtualAccountInfo) {
              return { data: cachedVirtualAccountInfo };
            }
            const { data } = await api.virtualAccounts.getVirtualAccountById(
              id
            );
            queryClient.setQueryData(["virtual-account-infos", id], data);
            return { data };
          })
        );
        return results.map((r) => r.data);
      },
      enabled: !!uniqueVirtualAccountIds.length,
    });

  const columns = useMemo(
    () => [
      {
        header: "No",
        cell: ({ row }: CellContext<Transition, number>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            renderNoTable({ page, pageSize }, row.index)
          );
        },
      },
      {
        header: "Card",
        cell: ({ row }: CellContext<Transition, string>) => {
          const cardInfo = cardInfos?.find(
            (card) => card.id === row.original.cardId
          );
          return isLoading || isLoadingCardInfos ? (
            <Skeleton />
          ) : (
            cardInfo?.name ?? "Unknown"
          );
        },
      },
      {
        header: "Virtual account",
        cell: ({ row }: CellContext<Transition, string>) => {
          const virtualAccountInfo = virtualAccountInfos?.find(
            (virtualAccount) =>
              virtualAccount.virtualAccount.id === row.original.virtualAccountId
          );
          return isLoading || isLoadingVirtualAccountInfos ? (
            <Skeleton />
          ) : (
            virtualAccountInfo?.virtualAccount?.name ?? "Unknown"
          );
        },
      },
      {
        header: "Amount",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            formatDollarByCent(row.original.amountCents)
          );
        },
      },
      {
        header: "Status",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? <Skeleton /> : row.original.status;
        },
      },
      {
        header: "Description",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? <Skeleton /> : row.original.description;
        },
      },
      {
        header: "Merchant",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            row.original.merchantData?.name ?? ""
          );
        },
      },
      {
        header: "Country",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            row.original.merchantData?.location?.country ?? ""
          );
        },
      },
      {
        header: "Date",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            formatDatetimeMMDDYYYY(row.original.date)
          );
        },
      },
    ],
    [
      page,
      isLoading,
      cardInfos,
      isLoadingCardInfos,
      virtualAccountInfos,
      isLoadingVirtualAccountInfos,
      pageSize,
    ]
  ) as ColumnDef<Transition>[];

  const handleChangeFilter = (field: string, value: string) => {
    setPage(1);
    setCursorMap(initCursorMap);
    setCurrentFilter({
      ...currentFilter,
      [field]: value,
      cursor: "",
    });
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Dashboard</PageTitle>
      </PageHeader>

      <Section>
        <SectionHeader>
          <SectionTitle>Transaction</SectionTitle>
        </SectionHeader>
        <SectionContent>
          <FilterTransaction
            onCardChange={(cardId) =>
              handleChangeFilter("filter:cardId", cardId)
            }
            onVirtualAccountChange={(virtualAccountId) =>
              handleChangeFilter("filter:virtualAccountId", virtualAccountId)
            }
          />
          <DataTable
            columns={columns}
            data={dataTransactionTable}
            maxHeight={"70vh"}
          />
          <CursorPagination
            page={page}
            cursorMap={cursorMap}
            hasNextPage={!!nextCursor}
            disableNext={isLoading}
            onPageChange={(cursor, newPage) => {
              setPage(newPage);
              setCursorMap((prev) => ({
                ...prev,
                [newPage]: cursor,
              }));
            }}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
