"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  formatUtcMMDDYYYYHHMM,
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
import { DataTable } from "@repo/ui/components/data-table";
import { Transaction } from "@/lib/api/endpoints/transaction";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@repo/ui/components/skeleton";
import FilterTransaction from "./components/filter";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { ClientPagination } from "@repo/ui/components/client-pagination";
import CardNameCol from "@repo/ui/components/card-name-col";
import { cn } from "@/lib/utils";
const initFilter = {
  cardId: "",
  virtualAccountId: "",
  startDate: "",
  endDate: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Transaction[];
export default function Dashboard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState(initFilter);

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard", href: "/dashboard" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", pagination.page, currentFilter],
    queryFn: async () => {
      const res = await api.transactions.getTransactions({
        ...currentFilter,
        page: pagination.page,
        limit: pagination.pageSize,
      });
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res.data;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataTransaction: Transaction[] = useMemo(() => data ?? [], [data]);
  const dataTransactionTable = useMemo(() => {
    if (isLoading) return maskDataTable;
    return dataTransaction;
  }, [dataTransaction, isLoading]);

  const columns = useMemo(
    () => [
      {
        header: "No",
        cell: ({ row }: CellContext<Transaction, number>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            renderNoTable(
              { page: pagination.page, pageSize: pagination.pageSize },
              row.index,
            )
          );
        },
      },
      {
        header: "Card",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            <CardNameCol
              card={row.original.card}
              cardId={row.original.cardId}
            />
          );
        },
      },
      {
        header: "Virtual account",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : row.original.virtualAccount?.name ? (
            row.original.virtualAccount?.name
          ) : (
            EMPTY_LABEL
          );
        },
      },
      {
        header: <p className={isLoading ? "" : "text-end"}>Amount</p>,
        id: "amount",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            <p
              className={cn(
                row.original.amountCents >= 0
                  ? "text-green-700"
                  : "text-red-500",
                "text-end",
              )}
            >
              {formatDollarByCent(row.original.amountCents)}
            </p>
          );
        },
      },
      {
        header: "Status",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? <Skeleton /> : <span className="capitalize">{row.original.detailedStatus}</span>
        },
      },
      {
        header: "Description",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? <Skeleton /> : row.original.description;
        },
      },
      {
        header: "Merchant",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            (row.original.merchantData?.description ?? EMPTY_LABEL)
          );
        },
      },
      {
        header: "Country",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            (row.original.merchantData?.location.country ?? EMPTY_LABEL)
          );
        },
      },
      {
        header: "Date",
        cell: ({ row }: CellContext<Transaction, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            formatUtcMMDDYYYYHHMM(row.original.date)
          );
        },
      },
    ],
    [isLoading, pagination],
  ) as ColumnDef<Transaction>[];

  const handleChangeFilter = (field: string, value: string | undefined) => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
    setCurrentFilter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Dashboard</PageTitle>
      </PageHeader>

      <Section>
        <SectionHeader>
          <SectionTitle>Transactions</SectionTitle>
        </SectionHeader>
        <SectionContent>
          <FilterTransaction
            onCardChange={(cardId) => handleChangeFilter("cardId", cardId)}
            onVirtualAccountChange={(virtualAccountId) =>
              handleChangeFilter("virtualAccountId", virtualAccountId)
            }
            onDateFromChange={(date) => handleChangeFilter("startDate", date)}
            onDateToChange={(date) => handleChangeFilter("endDate", date)}
            currentFilter={currentFilter}
            onStatusChange={(status) =>
              handleChangeFilter("detailedStatus", status)
            }
          />
          <DataTable
            columns={columns}
            data={dataTransactionTable}
            maxHeight={"65vh"}
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
