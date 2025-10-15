"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatUtcMMDDYYYY, renderNoTable } from "@/app/utils/func";
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
import { EMPTY_LABEL } from "@/app/utils/constants";
import { ClientPagination } from "@/components/ui/client-pagination";

const initFilter = {
  cardGroupId: "",
  virtualAccountId: "",
  status: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Card[];
export default function Cards() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState(initFilter);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Cards", href: "/cards" },
    ]);
  }, [setBreadcrumbs]);

  const { data: cardInfors, isLoading } = useQuery({
    queryKey: ["cards", pagination.page, currentFilter],
    queryFn: async () => {
      const res = await api.cards.getCards({
        ...currentFilter,
        page: pagination.page,
        limit: pagination.pageSize,
      });
      if (pagination.total === 0) {
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination.total,
        }));
      }
      return res.data;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataCard: Card[] = useMemo(() => cardInfors?.data ?? [], [cardInfors]);

  const [uniqueCardGroupIds, uniqueVirtualAccountIds]: string[][] =
    useMemo(() => {
      const cardGroupIds = dataCard.reduce((acc, item) => {
        if (!acc.includes(item.cardGroupName)) {
          acc.push(item.cardGroupName);
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

  // const { data: groupInfos, isLoading: isLoadingGroupInfos } = useQuery({
  //   queryKey: ["group-infos", uniqueCardGroupIds],
  //   queryFn: async () => {
  //     const results = await Promise.all(
  //       uniqueCardGroupIds.map((id) => api.cardGroups.getCardGroupById(id))
  //     );
  //     return results.map((r) => r.data);
  //   },
  //   enabled: !!uniqueCardGroupIds.length,
  // });

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
      // const groupName = card.cardGroupId
      //   ? groupInfos?.find((g) => g.id === card.cardGroupId)?.name
      //   : EMPTY_LABEL;
      const virtualAccountName =
        (virtualAccountInfos as VirtualAccount[])?.find(
          (v) => v.slashId === card.virtualAccountId
        )?.name ?? EMPTY_LABEL;
      return {
        ...card,
        groupName: EMPTY_LABEL,
        virtualAccountName,
      };
    });
  }, [dataCard, virtualAccountInfos, isLoading]);

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<Card, number>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          renderNoTable(
            {
              page: pagination.page,
              pageSize: pagination.pageSize,
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
        return isLoading || false ? <Skeleton /> : row.original.groupName;
      },
    },
    {
      header: "Virtual accounts",
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
          formatUtcMMDDYYYY(row.original.createdAt)
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
    setPagination((prev) => ({
      ...prev,
      page: 1,
      total: 0,
    }));
    setCurrentFilter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Cards</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCard
            onGroupChange={(groupId) =>
              handleChangeFilter("cardGroupId", groupId)
            }
            onVirtualAccountChange={(virtualAccountId) =>
              handleChangeFilter("virtualAccountId", virtualAccountId)
            }
            onStatusChange={(status) => handleChangeFilter("status", status)}
          />
          <DataTable
            columns={columns}
            data={dataCardGrouped}
            maxHeight={"70vh"}
          />
          <ClientPagination
            total={pagination.total}
            page={pagination.page}
            pageSize={pagination.pageSize}
            onChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
