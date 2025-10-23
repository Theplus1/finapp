"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatUtcMMDDYYYY, renderNoTable } from "@/app/utils/func";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import type { Card } from "@/lib/api/endpoints/card";
import { DataTable } from "@/components/ui/data-table";
import FilterCard from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { ClientPagination } from "@/components/ui/client-pagination";
import CardNameCol from "@/components/ui/card-name-col";

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
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataCard: Card[] = useMemo(() => cardInfors?.data ?? [], [cardInfors]);

  const dataCardGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    return dataCard.map((card) => {
      const virtualAccountName = card.virtualAccount?.name ?? EMPTY_LABEL;
      return {
        ...card,
        groupName: EMPTY_LABEL,
        virtualAccountName,
      };
    });
  }, [dataCard, isLoading]);

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
        return isLoading ? <Skeleton /> : <CardNameCol card={row.original} />;
      },
    },
    {
      header: "Group",
      cell: ({ row }: CellContext<Card & { groupName: string }, string>) => {
        return isLoading || false ? (
          <Skeleton />
        ) : (
          (row.original.cardGroup?.name ?? EMPTY_LABEL)
        );
      },
    },
    {
      header: "Virtual accounts",
      cell: ({
        row,
      }: CellContext<Card & { virtualAccountName: string }, string>) => {
        return isLoading ? <Skeleton /> : row.original.virtualAccountName;
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
