"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  formatDollarByCent,
  formatNumberAsPercentage,
  renderNoTable,
} from "@/app/utils/func";

import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { SectionContent } from "@/components/layouts/section";
import { Section } from "@/components/layouts/section";
import type { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { CursorPagination } from "@/components/ui/cursor-pagination";
import { EMPTY_LABEL } from "@/app/utils/constants";

const initCursorMap = {
  1: "",
};
const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as VirtualAccount[];
export default function VirtualAccount() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(0);
  const [cursorMap, setCursorMap] =
    useState<Record<number, string>>(initCursorMap);
  const [nextCursor, setNextCursor] = useState<string>();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Virtual accounts", href: "/virtual-account" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["virtual-accounts"],
    queryFn: async () => {
      const res = await api.virtualAccounts.getVirtualAccounts();
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

  const dataVirtualAccount: VirtualAccount[] = useMemo(() => {
    if (isLoading) return maskDataTable;
    return data?.items ?? [];
  }, [isLoading, data]);

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<VirtualAccount, number>) => {
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
      header: "Name",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        return isLoading ? <Skeleton /> : row.original.virtualAccount.name;
      },
    },
    {
      header: "Take Rate",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const takeRate =
          row.original.commissionRule?.commissionDetails?.takeRate;
        const takeRateLabel =
          typeof takeRate === "number"
            ? formatNumberAsPercentage(takeRate * 100)
            : EMPTY_LABEL;
        return isLoading ? <Skeleton /> : takeRateLabel;
      },
    },
    {
      header: "Balance",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const balance = row.original.balance?.amountCents;
        return isLoading ? <Skeleton /> : formatDollarByCent(balance);
      },
    },
    {
      header: "Spend (30d)",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const spend = row.original.spend?.amountCents;
        return isLoading ? <Skeleton /> : formatDollarByCent(spend);
      },
    },
    {
      header: "Routing / Account",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const routingNumber = row.original.virtualAccount?.routingNumber;
        const accountNumber = row.original.virtualAccount?.accountNumber;
        return isLoading ? (
          <Skeleton />
        ) : (
          <>
            <div>
              <span className="font-medium">Routing:</span> {routingNumber}
            </div>
            <div>
              <span className="font-medium">Account:</span> {accountNumber}
            </div>
          </>
        );
      },
    },
  ] as ColumnDef<VirtualAccount>[];

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Virtual accounts</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <DataTable
            columns={columns}
            data={dataVirtualAccount}
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
