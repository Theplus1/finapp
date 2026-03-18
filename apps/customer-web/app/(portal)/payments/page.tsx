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
import FilterTime from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import {
  Payment,
  PaymentResponse,
  PaymentRow,
} from "@/lib/api/endpoints/payment";
import { EMPTY_LABEL } from "@/app/utils/constants";
import Statistic from "./components/statistic";

const now = new Date();

const initFilter = {
  from: new Date(now.getFullYear(), now.getMonth(), 2)
    .toISOString()
    .slice(0, 10),
  to: now.toISOString().slice(0, 10),
};

const dateColumnLabel = [
  "Recharge",
  "Consume",
  "Consume outside US",
  "Consume in US",
  "Refund",
];

const initDataPayment = {
  virtualAccountId: "",
  currency: "USD",
  timezone: "local",
  range: {
    from: "",
    to: "",
  },
  rows: [],
  summary: {
    totalDepositCents: 0,
    totalSpendCents: 0,
    totalSpendUsCents: 0,
    totalSpendNonUsCents: 0,
    totalRefundCents: 0,
    endingAccountBalanceCents: 0,
  },
};

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
      const res = await api.payment.getPayments({
        from: currentFilter.from,
        to: currentFilter.to,
      });
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const { data: overallPaymentInfors, isLoading: isOverallLoading } = useQuery({
    queryKey: ["overall-payments"],
    queryFn: async () => {
      const res = await api.payment.getOverallPayments();
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataPayment: PaymentResponse = useMemo(
    () => paymentInfors?.data ?? initDataPayment,
    [paymentInfors],
  );

  const overallDataPayment: PaymentResponse = useMemo(
    () => overallPaymentInfors?.data ?? initDataPayment,
    [overallPaymentInfors],
  );

  const dataPaymentGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    function transformPaymentData(data: PaymentRow[]) {
      const result = {
        totalNap: {} as Record<string, number>,
        totalTieu: {} as Record<string, number>,
        spendNonUsCents: {} as Record<string, number>,
        spendUsCents: {} as Record<string, number>,
        refundCents: {} as Record<string, number>,
      };

      data.forEach((item) => {
        result.totalNap[item.date] = item.depositCents;
        result.totalTieu[item.date] = item.spendCents;
        result.spendNonUsCents[item.date] = item.spendNonUsCents;
        result.spendUsCents[item.date] = item.spendUsCents;
        result.refundCents[item.date] = item.refundCents;
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
        {
          label: "Refund",
          key: "refundCents",
          data: result.refundCents,
        },
      ];
    }

    return transformPaymentData(dataPayment.rows);
  }, [dataPayment, isLoading]);

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
            <div className="w-[100px] text-center">{`${dayStr}/${monthStr}`}</div>
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
    return [
      {
        header: "Date",
        cell: ({ row }: CellContext<Payment, number>) => {
          return dateColumnLabel[row.index];
        },
        meta: {
          fixed: 0,
        },
      },
      ...generateDateColumns(
        Number(detectMonthYear(currentFilter.from).month),
        Number(detectMonthYear(currentFilter.from).year),
      ),
    ] as ColumnDef<Payment>[];
  }, [currentFilter.from, isLoading]);
  const handleChangeFilter = (monthYear: string) => {
    const [year, month] = monthYear.split("-");
    const firstDateOfMonth = "01";
    const endDateOfMonth = new Date(Number(year), Number(month), 0).getDate();
    setCurrentFilter((prev) => ({
      ...prev,
      from: `${year}-${month}-${firstDateOfMonth}`,
      to: `${year}-${month}-${endDateOfMonth}`,
    }));
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Payments</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <Statistic
            containerClassName="mb-6"
            data={overallDataPayment.summary}
            loading={isOverallLoading}
          />
          <FilterTime onFilterChange={handleChangeFilter} />
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
