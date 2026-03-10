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
import FilterCard from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Payment, PaymentRow } from "@/lib/api/endpoints/payment";
import { EMPTY_LABEL } from "@/app/utils/constants";
// import Statistic from "./components/statistic";

const initFilter = {
  month: "2026-02",
};

const dateColumnLabel = [
  "Recharge",
  "Consume",
  "Consume outside US",
  "Consume in US",
];

const maskDataTable = Array.from({ length: 4 }, () => {
  return {};
}) as Payment[];

const detectMonthYear = (month: string) => {
  const [year, monthNum] = month.split("-");
  return { year, month: monthNum };
};

export default function Cards() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [currentFilter, setCurrentFilter] = useState(initFilter);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Payments", href: "/payments" },
    ]);
  }, [setBreadcrumbs]);

  const { data: paymentInfors, isLoading } = useQuery({
    queryKey: ["payments", currentFilter],
    queryFn: async () => {
      const res = await api.payment.getPayments(currentFilter);
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataPayment: Payment[] = useMemo(
    () => paymentInfors?.data ?? [],
    [paymentInfors],
  );

  const dataPaymentGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    const fakeData: PaymentRow[] = [
      {
        date: "2026-02-02",
        depositCents: 12300,
        spendCents: 526,
        spendNonUsCents: 0,
        spendUsCents: 526,
        refundCents: 0,
        accountBalanceCents: -113446905,
      },
      {
        date: "2026-02-11",
        depositCents: 4324,
        spendCents: 0,
        spendNonUsCents: 4234,
        spendUsCents: 123,
        refundCents: 0,
        accountBalanceCents: 0,
      },
    ];

    function transformPaymentData(data: PaymentRow[]) {
      const result = {
        totalNap: {} as Record<string, number>,
        totalTieu: {} as Record<string, number>,
        spendNonUsCents: {} as Record<string, number>,
        spendUsCents: {} as Record<string, number>,
      };

      data.forEach((item) => {
        result.totalNap[item.date] = item.depositCents;
        result.totalTieu[item.date] = item.spendCents;
        result.spendNonUsCents[item.date] = item.spendNonUsCents;
        result.spendUsCents[item.date] = item.spendUsCents;
      });

      return [
        { label: "Recharge", key: "totalNap", data: result.totalNap },
        { label: "Consume", key: "totalTieu", data: result.totalTieu },
        {
          label: "Consume outside US",
          key: "spendNonUsCents",
          data: result.spendNonUsCents,
        },
        {
          label: "Consume in US",
          key: "spendUsCents",
          data: result.spendUsCents,
        },
      ];
    }

    return transformPaymentData(fakeData);
  }, [dataPayment, isLoading]);

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
          <div style={{ textAlign: "center", width: "60px" }}>
            {`${dayStr}/${monthStr}`}
          </div>
        ) as unknown as string,
        cell: ({ row }) => {
          return isLoading ? (
            <Skeleton />
          ) : (
            <div style={{ textAlign: "end" }}>
              {(
                row.original as Payment & {
                  data: Record<string, number>;
                }
              ).data[dateKey] > 0
                ? formatDollarByCent(
                    (
                      row.original as Payment & {
                        data: Record<string, number>;
                      }
                    ).data[dateKey],
                  )
                : EMPTY_LABEL}
            </div>
          );
        },
      };
    });
  }

  const columns = [
    {
      header: "Date",
      cell: ({ row }: CellContext<Payment, number>) => {
        return dateColumnLabel[row.index];
      },
      meta: {
        className: "sticky left-0 bg-white z-10",
        style: {
          width: "600px",
        },
      },
    },
    ...generateDateColumns(
      Number(detectMonthYear(currentFilter.month).month),
      Number(detectMonthYear(currentFilter.month).year),
    ),
  ] as ColumnDef<Payment>[];

  const handleChangeFilter = (field: string, value: string) => {
    setCurrentFilter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Payments</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCard
            onMonthChange={(month) => handleChangeFilter("month", month)}
          />
          {/* <Statistic /> */}
          <DataTable
            columns={columns}
            data={dataPaymentGrouped as Payment[]}
            maxHeight={"70vh"}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
