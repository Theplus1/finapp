"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDollarByCent, formatNumberAsPercentage } from "@/app/utils/func";
import {
  Table,
  TableHeader,
  TableRow,
  TableBody,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { SectionContent } from "@/components/layouts/section";
import { Section } from "@/components/layouts/section";
import type { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

export default function VirtualAccount() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Virtual Account", href: "/virtual-account" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["virtual-accounts"],
    queryFn: () => api.virtualAccounts.getVirtualAccounts(),
  });

  const dataVirtualAccount: VirtualAccount[] = useMemo(
    () => data?.data?.items ?? [],
    [data]
  );

  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return dataVirtualAccount.slice(start, end);
  }, [dataVirtualAccount, pagination.page, pagination.pageSize]);

  if (isLoading) return <Spinner />;
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Virtual Account</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent className="bg-muted/50 p-6 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Take Rate</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Spend (30d)</TableHead>
                <TableHead>Routing / Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, i) => {
                const takeRate =
                  item.commissionRule?.commissionDetails?.takeRate;
                const takeRateLabel =
                  typeof takeRate === "number"
                    ? formatNumberAsPercentage(takeRate * 100)
                    : "";
                return (
                  <TableRow
                    key={i}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>{item.virtualAccount.name}</TableCell>
                    <TableCell>{takeRateLabel}</TableCell>
                    <TableCell>
                      {formatDollarByCent(item.balance.amountCents)}
                    </TableCell>
                    <TableCell>
                      {formatDollarByCent(item.spend.amountCents)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">Routing:</span>{" "}
                        {item.virtualAccount.routingNumber}
                      </div>
                      <div>
                        <span className="font-medium">Account:</span>{" "}
                        {item.virtualAccount.accountNumber}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
