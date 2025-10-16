"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDollarByCent, renderNoTable } from "@/app/utils/func";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { CardGroup } from "@/lib/api/endpoints/card-group";
import { DataTable } from "@/components/ui/data-table";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientPagination } from "@/components/ui/client-pagination";
import { EMPTY_LABEL } from "@/app/utils/constants";
const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as CardGroup[];
export default function GroupCard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Group cards", href: "/group-card" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["card-group"],
    queryFn: async () => {
      const res = await api.cardGroups.getCardGroup();
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res.data;
    },
  });

  const dataCardGroup: CardGroup[] = useMemo(() => {
    if (isLoading) return maskDataTable;
    return data ?? [];
  }, [isLoading, data]);

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<CardGroup, number>) => {
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
      header: "Group Name",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        return isLoading ? <Skeleton /> : row.original.name;
      },
    },
    {
      header: "Virtual accounts",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          (row.original.virtualAccount?.name ??
            `ID: ${row.original.virtualAccountId}`)
        );
      },
    },
    {
      header: "Daily Limit",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        const dailyLimitV1 = undefined;
        const dailyLimitV2 = undefined;
        return isLoading ? (
          <Skeleton />
        ) : (
          <div>
            <div>
              <span>
                V1:{" "}
                {dailyLimitV1 ? formatDollarByCent(dailyLimitV1) : EMPTY_LABEL}
              </span>
            </div>
            <div>
              <span>
                V2:{" "}
                {dailyLimitV2 ? formatDollarByCent(dailyLimitV2) : EMPTY_LABEL}
              </span>
            </div>
          </div>
        );
      },
    },
  ] as ColumnDef<CardGroup>[];
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Group cards</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <DataTable
            columns={columns}
            data={dataCardGroup}
            maxHeight={"70vh"}
          />
          <ClientPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(newPage) => {
              setPagination((prev) => ({
                ...prev,
                page: newPage,
              }));
            }}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
