"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { DataTable } from "@/components/ui/data-table";
import { Transition } from "@/lib/api/endpoints/transaction";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/lib/api/endpoints/card";
import FilterTransaction from "./components/filter";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { ClientPagination } from "@/components/ui/client-pagination";

const initFilter = {
  cardId: "",
  virtualAccountId: "",
  startDate: "",
  endDate: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Transition[];
export default function Dashboard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState(initFilter);
  const queryClient = useQueryClient();

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
      if (pagination.total === 0) {
        setPagination((prev) => ({
          ...prev,
          total: res.data.pagination?.total ?? 0,
        }));
      }
      return res.data;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataTransaction: Transition[] = useMemo(() => data?.data ?? [], [data]);
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
            const { data } =
              await api.virtualAccounts.getVirtualAccountById(id);
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
            renderNoTable(
              { page: pagination.page, pageSize: pagination.pageSize },
              row.index
            )
          );
        },
      },
      {
        header: "Card",
        cell: ({ row }: CellContext<Transition, string>) => {
          const cardInfo = cardInfos?.find(
            (card) => card.slashId === row.original.cardId
          );
          return isLoading || isLoadingCardInfos ? (
            <Skeleton />
          ) : cardInfo?.name ? (
            `${cardInfo.name} ${cardInfo.last4}`
          ) : (
            EMPTY_LABEL
          );
        },
      },
      {
        header: "Virtual account",
        cell: ({ row }: CellContext<Transition, string>) => {
          const virtualAccountInfo = virtualAccountInfos?.find(
            (virtualAccount) =>
              virtualAccount.slashId === row.original.virtualAccountId
          );
          return isLoading || isLoadingVirtualAccountInfos ? (
            <Skeleton />
          ) : (
            (virtualAccountInfo?.name ?? EMPTY_LABEL)
          );
        },
      },
      {
        header: "Amount",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            <span
              className={
                row.original.amountCents >= 0
                  ? "text-green-700"
                  : "text-red-500"
              }
            >
              {formatDollarByCent(row.original.amountCents)}
            </span>
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
          return isLoading ? <Skeleton /> : EMPTY_LABEL;
        },
      },
      {
        header: "Country",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? <Skeleton /> : EMPTY_LABEL;
        },
      },
      {
        header: "Date",
        cell: ({ row }: CellContext<Transition, string>) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            formatUtcMMDDYYYYHHMM(row.original.date)
          );
        },
      },
    ],
    [
      isLoading,
      cardInfos,
      isLoadingCardInfos,
      virtualAccountInfos,
      isLoadingVirtualAccountInfos,
      pagination,
    ]
  ) as ColumnDef<Transition>[];

  const handleChangeFilter = (field: string, value: string | undefined) => {
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
          />
          <DataTable
            columns={columns}
            data={dataTransactionTable}
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
