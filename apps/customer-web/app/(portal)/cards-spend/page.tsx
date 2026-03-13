"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDollarByCent } from "@/app/utils/func";
import { Skeleton } from "@repo/ui/components/skeleton";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import { DataTable } from "@repo/ui/components/data-table";
import FilterCardSpend from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Payment } from "@/lib/api/endpoints/payment";
import { EMPTY_LABEL } from "@/app/utils/constants";
import {
  CardSpendResponse,
  CardSpendRow,
} from "@/lib/api/endpoints/card-spend";
import { useDebounce } from "@repo/ui/hooks/use-debounce";

const now = new Date();

const initFilter = {
  from: new Date(now.getFullYear(), now.getMonth(), 2)
    .toISOString()
    .slice(0, 10),
  to: now.toISOString().slice(0, 10),
};

const initDataPayment = {
  virtualAccountId: "",
  currency: "USD",
  timezone: "local",
  range: {
    from: initFilter.from,
    to: initFilter.to,
  },
  days: [],
  rows: [],
};

const maskDataTable = Array.from({ length: 4 }, () => {
  return {};
}) as CardSpendRow[];

const detectMonthYear = (month: string) => {
  const [year, monthNum] = month.split("-");
  return { year, month: monthNum };
};

type RowData = Payment & {
  data: Record<string, number>;
};

export default function Cards() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [currentFilter, setCurrentFilter] = useState(initFilter);
  const [keywordCard, setKeywordCard] = useState("");
  const keywordCardDebounce = useDebounce(keywordCard, 300).toLowerCase();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Cards Spend", href: "/cards-spend" },
    ]);
  }, [setBreadcrumbs]);

  const { data: cardSpendInfors, isLoading } = useQuery({
    queryKey: ["card-spend", currentFilter],
    queryFn: async () => {
      const res = await api.cardSpend.getCardSpend({
        from: currentFilter.from,
        to: currentFilter.to,
      });
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataCardSpend: CardSpendResponse = useMemo(
    () => cardSpendInfors?.data ?? initDataPayment,
    [cardSpendInfors],
  );

  const dataCardSpendGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    function transformCardSpendData(data: CardSpendRow[]): CardSpendRow[] {
      const cloned = [...data];
      const lastItem = cloned.pop();
      if (lastItem) cloned.unshift(lastItem);

      return cloned.map((d) => {
        return {
          cardId: d.cardId,
          cardName: d.cardName,
          isTotal: d.isTotal,
          daySpendCents: d.daySpendCents,
          totalSpendCents: d.totalSpendCents,
          label: d.cardName,
          key: d.cardId,
          data: d.daySpendCents,
        };
      });
    }

    return transformCardSpendData(dataCardSpend.rows);
  }, [dataCardSpend, isLoading]);

  const columns = useMemo(() => {
    function generateDateColumns(
      month: number,
      year: number,
    ): ColumnDef<Payment>[] {
      const days = new Date(year, month, 0).getDate();

      return Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const dayStr = String(day).padStart(2, "0");
        const monthStr = String(month).padStart(2, "0");

        const dateKey = `${year}-${monthStr}-${dayStr}`;

        return {
          accessorKey: dateKey,
          header: (
            <div style={{ textAlign: "center", width: "100px" }}>
              {`${dayStr}/${monthStr}`}
            </div>
          ) as unknown as string,
          cell: ({ row }) => {
            return isLoading ? (
              <Skeleton />
            ) : (
              <div style={{ textAlign: "end" }}>
                {(row.original as RowData).data[dateKey] > 0
                  ? formatDollarByCent((row.original as RowData).data[dateKey])
                  : EMPTY_LABEL}
              </div>
            );
          },
        };
      });
    }

    return [
      {
        header: "Card",
        cell: ({
          row,
        }: CellContext<CardSpendRow & { label: string }, number>) => {
          return isLoading ? <Skeleton /> : row.original.label;
        },
      },
      ...generateDateColumns(
        Number(detectMonthYear(currentFilter.from).month),
        Number(detectMonthYear(currentFilter.from).year),
      ),
    ] as ColumnDef<CardSpendRow>[];
  }, [currentFilter.from, isLoading]);

  const handleChangeMonth = (monthYear: string) => {
    const [year, month] = monthYear.split("-");
    const firstDateOfMonth = "01";
    const endDateOfMonth = new Date(Number(year), Number(month), 0).getDate();
    setCurrentFilter((prev) => ({
      ...prev,
      from: `${year}-${month}-${firstDateOfMonth}`,
      to: `${year}-${month}-${endDateOfMonth}`,
    }));
  };

  const handleChangeCard = (card: string) => {
    setKeywordCard(card);
  };

  const dataCardSpendRender = useMemo(() => {
    return dataCardSpendGrouped.filter(
      (item: any) =>
        item.label === "Total" ||
        item.label?.toLowerCase().includes(keywordCardDebounce),
    );
  }, [dataCardSpendGrouped, keywordCardDebounce]);

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Cards Spend</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCardSpend
            keywordCard={keywordCard}
            onFilterMonthChange={handleChangeMonth}
            onFilterCardChange={handleChangeCard}
          />
          <DataTable
            columns={columns}
            data={dataCardSpendRender}
            maxHeight={"70vh"}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
