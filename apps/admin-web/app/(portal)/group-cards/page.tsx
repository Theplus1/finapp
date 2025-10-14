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
import { CursorPagination } from "@/components/ui/cursor-pagination";
const initCursorMap = {
  1: "",
};
const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as CardGroup[];
export default function GroupCard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(0);
  const [cursorMap, setCursorMap] =
    useState<Record<number, string>>(initCursorMap);
  const [nextCursor, setNextCursor] = useState<string>();

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
      const { nextCursor, count } = res.data.metadata;
      setNextCursor(nextCursor as string);
      if (!pageSize) {
        setPageSize(count);
      }
      setCursorMap((prev) => ({
        ...prev,
        [page + 1]: nextCursor as string,
      }));
      return res.data;
    },
  });

  const dataCardGroup: CardGroup[] = useMemo(() => {
    if (isLoading) return maskDataTable;
    return data?.items ?? [];
  }, [isLoading, data]);

  const [uniqueVirtualAccountIds]: string[][] = useMemo(() => {
    const virtualAccountIds = dataCardGroup.reduce((acc, item) => {
      if (!acc.includes(item.virtualAccountId)) {
        acc.push(item.virtualAccountId);
      }
      return acc;
    }, [] as string[]);
    return [virtualAccountIds];
  }, [dataCardGroup]);

  const { data: virtualAccountInfos } = useQuery({
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

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<CardGroup, number>) => {
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
      header: "Group Name",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        return isLoading ? <Skeleton /> : row.original.name;
      },
    },
    {
      header: "Virtual accounts",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        const virtualAccountInfo = virtualAccountInfos?.find(
          (virtualAccount) =>
            virtualAccount.virtualAccount?.id === row.original.virtualAccountId
        );
        return isLoading ? (
          <Skeleton />
        ) : (
          (virtualAccountInfo?.virtualAccount?.name ??
            `ID: ${row.original.virtualAccountId}`)
        );
      },
    },
    {
      header: "Daily Limit",
      cell: ({ row }: CellContext<CardGroup, string>) => {
        const dailyLimitV1 =
          row.original.spendingConstraint?.spendingRule?.utilizationLimit
            ?.limitAmount?.amountCents;
        const dailyLimitV2 =
          row.original.spendingConstraint?.spendingRule?.utilizationLimitV2?.[0]
            ?.limitAmount?.amountCents;
        return isLoading ? (
          <Skeleton />
        ) : (
          <div>
            <div>
              {typeof dailyLimitV1 !== "undefined" && (
                <span>V1: {formatDollarByCent(dailyLimitV1)}</span>
              )}
            </div>
            <div>
              {typeof dailyLimitV2 !== "undefined" && (
                <span>V2: {formatDollarByCent(dailyLimitV2)}</span>
              )}
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
