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
import { DataTable } from "@repo/ui/components/data-table";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@repo/ui/components/skeleton";
import { ClientPagination } from "@repo/ui/components/client-pagination";
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
      { label: "Card groups", href: "/card-groups" },
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
        const dailyLimitV1 =
          row.original?.spendingConstraint?.spendingRule?.utilizationLimit
            ?.limitAmount?.amountCents;
        const dailyLimitV2 =
          row.original?.spendingConstraint?.spendingRule?.utilizationLimitV2 ??
          [];
        return isLoading ? (
          <Skeleton />
        ) : (
          <div>
            <div>
              <span>
                V1:{" "}
                {dailyLimitV1 !== undefined
                  ? formatDollarByCent(dailyLimitV1)
                  : EMPTY_LABEL}
              </span>
            </div>
            <div className="flex gap-1">
              <div>V2: </div>
              <div>
                {/* {dailyLimitV2.length > 0
                  ? dailyLimitV2.map((item, index) => (
                      <div key={index}>
                        {index + 1}. {formatDollarByCent(item?.limitAmount?.amountCents ?? 0)}
                      </div>
                    ))
                  : EMPTY_LABEL} */}
                {dailyLimitV2.length > 0
                  ? formatDollarByCent(
                      dailyLimitV2[0]?.limitAmount?.amountCents ?? 0
                    )
                  : EMPTY_LABEL}
              </div>
            </div>
          </div>
        );
      },
    },
  ] as ColumnDef<CardGroup>[];
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Card groups</PageTitle>
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
