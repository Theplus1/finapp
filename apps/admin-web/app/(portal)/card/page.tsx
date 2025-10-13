"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDatetimeMMDDYYYY, renderNoTable } from "@/app/utils/func";
import { Skeleton } from "@/components/ui/skeleton";
import { CursorPagination } from "@/components/ui/cursor-pagination";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import type { Card } from "@/lib/api/endpoints/card";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { DataTable } from "@/components/ui/data-table";
import FilterCard from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";

const initFilter = {
  "filter:cardGroupId": "",
  "filter:virtualAccountId": "",
  "filter:status": "",
  cursor: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Card[];
const initCursorMap = {
  1: "",
};
export default function Card() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(0);
  const [cursorMap, setCursorMap] =
    useState<Record<number, string>>(initCursorMap);
  const [nextCursor, setNextCursor] = useState<string>();
  const [currentFilter, setCurrentFilter] = useState(initFilter);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Card", href: "/card" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["cards", page, currentFilter],
    queryFn: async () => {
      const currentCursor = cursorMap[page] ?? "";
      const res = await api.cards.getCards({
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

  const dataCard: Card[] = useMemo(() => data?.items ?? [], [data]);

  const [uniqueCardGroupIds, uniqueVirtualAccountIds]: string[][] =
    useMemo(() => {
      const cardGroupIds = dataCard.reduce((acc, item) => {
        if (!acc.includes(item.cardGroupId)) {
          acc.push(item.cardGroupId);
        }
        return acc;
      }, [] as string[]);
      const virtualAccountIds = dataCard.reduce((acc, item) => {
        if (!acc.includes(item.virtualAccountId)) {
          acc.push(item.virtualAccountId);
        }
        return acc;
      }, [] as string[]);
      return [cardGroupIds, virtualAccountIds];
    }, [dataCard]);

  const { data: groupInfos, isLoading: isLoadingGroupInfos } = useQuery({
    queryKey: ["group-infos", uniqueCardGroupIds],
    queryFn: async () => {
      const results = await Promise.all(
        uniqueCardGroupIds.map((id) => api.cardGroups.getCardGroupById(id))
      );
      return results.map((r) => r.data);
    },
    enabled: !!uniqueCardGroupIds.length,
  });

  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos", uniqueVirtualAccountIds],
      queryFn: async () => {
        const results = await Promise.all(
          uniqueVirtualAccountIds.map((id) =>
            api.virtualAccounts.getVirtualAccountById(id)
          )
        );
        return results.map((r) => r.data);
      },
      enabled: !!uniqueVirtualAccountIds.length,
    });

  const dataCardGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    return dataCard.map((card) => {
      const groupName = card.cardGroupId
        ? groupInfos?.find((g) => g.id === card.cardGroupId)?.name
        : "Unknown";
      const virtualAccountName =
        (virtualAccountInfos as VirtualAccount[])?.find(
          (v) => v.virtualAccount?.id === card.virtualAccountId
        )?.virtualAccount?.name ?? "Unknown";
      return {
        ...card,
        groupName,
        virtualAccountName,
      };
    });
  }, [dataCard, groupInfos, virtualAccountInfos, isLoading]);

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<Card, number>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          renderNoTable(
            {
              page,
              pageSize,
            },
            row.index
          )
        );
      },
    },
    {
      header: "Card Name",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          `${row.original.name} ${row.original.last4}`
        );
      },
    },
    {
      header: "Group",
      cell: ({ row }: CellContext<Card & { groupName: string }, string>) => {
        return isLoading || isLoadingGroupInfos ? (
          <Skeleton />
        ) : (
          row.original.groupName
        );
      },
    },
    {
      header: "Virtual Account",
      cell: ({
        row,
      }: CellContext<Card & { virtualAccountName: string }, string>) => {
        return isLoading || isLoadingVirtualAccountInfos ? (
          <Skeleton />
        ) : (
          row.original.virtualAccountName
        );
      },
    },
    {
      header: "Status",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          <span className="capitalize">{row.original.status}</span>
        );
      },
    },
    {
      header: "Created",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          formatDatetimeMMDDYYYY(row.original.createdAt)
        );
      },
    },
    {
      header: "Expiry",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          `${row.original.expiryMonth}/${row.original.expiryYear}`
        );
      },
    },
  ] as ColumnDef<Card>[];

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
        <PageTitle>Card</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCard
            onGroupChange={(groupId) =>
              handleChangeFilter("filter:cardGroupId", groupId)
            }
            onVirtualAccountChange={(virtualAccountId) =>
              handleChangeFilter("filter:virtualAccountId", virtualAccountId)
            }
            onStatusChange={(status) =>
              handleChangeFilter("filter:status", status)
            }
          />
          <DataTable
            columns={columns}
            data={dataCardGrouped}
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
