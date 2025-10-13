"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Table,
  TableHeader,
  TableRow,
  TableBody,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { formatDollarByCent } from "@/app/utils/func";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { CardGroup } from "@/lib/api/endpoints/card-group";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

export default function GroupCard() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 15,
  });

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Group card", href: "/group-card" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["card-group"],
    queryFn: () => api.cardGroups.getCardGroup(),
  });

  const dataCardGroup: CardGroup[] = useMemo(
    () => data?.data?.items ?? [],
    [data]
  );

  const [uniqueVirtualAccountIds]: string[][] = useMemo(() => {
    const virtualAccountIds = dataCardGroup.reduce((acc, item) => {
      if (!acc.includes(item.virtualAccountId)) {
        acc.push(item.virtualAccountId);
      }
      return acc;
    }, [] as string[]);
    return [virtualAccountIds];
  }, [dataCardGroup]);

  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
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

  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return dataCardGroup.slice(start, end);
  }, [dataCardGroup, pagination.page, pagination.pageSize]);
  if (isLoading) return <Spinner />;
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Group card</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent className="bg-muted/50 p-6 rounded-xl overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Group Name</TableHead>
                <TableHead>Virtual Account</TableHead>
                <TableHead>Daily Limit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, i) => {
                const dailyLimitV1 =
                  item.spendingConstraint?.spendingRule?.utilizationLimit
                    ?.limitAmount?.amountCents;
                const dailyLimitV2 =
                  item.spendingConstraint?.spendingRule?.utilizationLimitV2?.[0]
                    ?.limitAmount?.amountCents;
                return (
                  <TableRow
                    key={i}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {isLoadingVirtualAccountInfos ? (
                        <Spinner />
                      ) : (
                        (virtualAccountInfos as VirtualAccount[])?.find(
                          (v) => v.virtualAccount?.id === item.virtualAccountId
                        )?.virtualAccount?.name ??
                        `ID: ${item.virtualAccountId}`
                      )}
                    </TableCell>
                    <TableCell>
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
