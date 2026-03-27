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
import FilterTable from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import {
  Payment,
  PaymentOverallResponse,
  PaymentResponse,
  PaymentRow,
} from "@/lib/api/endpoints/payment";
import { EMPTY_LABEL } from "@/app/utils/constants";
import Statistic from "./components/statistic";
import FilterVirtualAccount from "../cards/components/filter-virtual-account";

const now = new Date();
const initFilter = {
  from: new Date(now.getFullYear(), now.getMonth(), 2)
    .toISOString()
    .slice(0, 10),
  to: now.toISOString().slice(0, 10),
  virtualAccountId: "",
};

const dateColumnLabel = ["Consume outside US", "Consume in US"];

const initDataPayment: PaymentResponse = {
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
    totalSpendCentsForAdmin: 0,
    totalSpendCents: 0,
    endingAccountBalanceCents: 0,
    totalSpendUsCentsForAdmin: 0,
    totalSpendNonUsCentsForAdmin: 0,
    totalRefundCents: 0,
    endingAccountBalanceCentsForAdmin: 0,
  },
};

const initOverallDataPayment: PaymentOverallResponse = {
  virtualAccountId: "",
  currency: "USD",
  timezone: "local",
  summary: {
    totalDepositCents: 0,
    totalSpendCentsForAdmin: 0,
    totalSpendCents: 0,
    endingAccountBalanceCents: 0,
    totalSpendUsCentsForAdmin: 0,
    totalSpendNonUsCentsForAdmin: 0,
    totalRefundCents: 0,
    endingAccountBalanceCentsForAdmin: 0,
  },
};

const maskDataTable = Array.from({ length: 2 }, () => {
  return {};
}) as Payment[];

const detectMonthYear = (month: string) => {
  const [year, monthNum] = month.split("-");
  return { year, month: monthNum };
};

export default function Locations() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [currentFilter, setCurrentFilter] = useState(initFilter);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Locations", href: "/locations" },
    ]);
  }, [setBreadcrumbs]);

  const { data: paymentInfors, isLoading } = useQuery({
    queryKey: ["payments", currentFilter.from, currentFilter.virtualAccountId],
    queryFn: async () => {
      if (!currentFilter.virtualAccountId) {
        return {
          data: initDataPayment,
        };
      }
      const res = await api.payment.getPayments(currentFilter);
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const { data: overallPaymentInfors, isLoading: isOverallLoading } = useQuery({
    queryKey: ["overall-payments", currentFilter.virtualAccountId],
    queryFn: async () => {
      if (!currentFilter.virtualAccountId) {
        return {
          data: initOverallDataPayment,
        };
      }
      const res = await api.payment.getOverallPayments(
        currentFilter.virtualAccountId,
      );
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataPayment: PaymentResponse = useMemo(
    () => paymentInfors?.data ?? initDataPayment,
    [paymentInfors],
  );

  const overallDataPayment: PaymentOverallResponse = useMemo(
    () => overallPaymentInfors?.data ?? initOverallDataPayment,
    [overallPaymentInfors],
  );

  const dataPaymentGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    function transformPaymentData(data: PaymentRow[]) {
      const result = {
        totalSpendNonUsCentsForAdmin: {} as Record<string, number>,
        totalSpendUsCentsForAdmin: {} as Record<string, number>,
      };

      data.forEach((item) => {
        result.totalSpendNonUsCentsForAdmin[item.date] =
          item.spendNonUsCentsForAdmin;
        result.totalSpendUsCentsForAdmin[item.date] = item.spendUsCentsForAdmin;
      });

      return [
        {
          label: "Consume outside US",
          key: "totalSpendNonUsCentsForAdmin",
          data: result.totalSpendNonUsCentsForAdmin,
        },
        {
          label: "Consume in US",
          key: "totalSpendUsCentsForAdmin",
          data: result.totalSpendUsCentsForAdmin,
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
      {
        id: "summary",
        header: <p className="text-end">Summary</p>,
        cell: ({
          row,
        }: CellContext<
          Payment & { key: keyof Payment["summary"] },
          number
        >) => {
          if (isLoading) return <Skeleton />;
          const value = dataPayment.summary[row.original.key];
          return <p className="text-end">{formatDollarByCent(value)}</p>;
        },
      },
      ...generateDateColumns(
        Number(detectMonthYear(currentFilter.from).month),
        Number(detectMonthYear(currentFilter.from).year),
      ),
    ] as ColumnDef<Payment>[];
  }, [currentFilter.from, currentFilter.virtualAccountId, isLoading, dataPayment.summary]);

  const handleChangeVirtualAccount = (virtualAccountId: string) => {
    setCurrentFilter((prev) => ({
      ...prev,
      virtualAccountId,
    }));
  };

  const handleMonthChange = (monthYear: string) => {
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
        <PageTitle>Locations</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <div className="pb-4">
            <FilterVirtualAccount
              onVirtualAccountChange={handleChangeVirtualAccount}
              showAll={false}
            />
          </div>
          <Statistic
            containerClassName="mb-6"
            data={overallDataPayment.summary}
            loading={isOverallLoading}
          />
          <FilterTable onChangeMonth={handleMonthChange} />
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
