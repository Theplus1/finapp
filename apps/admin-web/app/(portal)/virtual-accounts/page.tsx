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
import { EMPTY_LABEL } from "@/app/utils/constants";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyIcon } from "@/components/ui/copy-button";
import { ClientPagination } from "@/components/ui/client-pagination";
import FormLinkTelegram from "./(components)/form-link-telegram";
import { cn } from "@/lib/utils";

const fakeIdTelegram = "fakeID";
const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as VirtualAccount[];
export default function VirtualAccount() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [openDrawer, setOpenDrawer] = useState(false);
  const [virtualAccountEdit, setVirtualAccountEdit] =
    useState<VirtualAccount | null>(null);
  const [countGetList, setCountGetList] = useState(0);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Virtual accounts", href: "/virtual-account" },
    ]);
  }, [setBreadcrumbs]);

  const { data, isLoading } = useQuery({
    queryKey: ["virtual-accounts", countGetList],
    queryFn: async () => {
      const res = await api.virtualAccounts.getVirtualAccounts();
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res.data;
    },
  });

  const dataVirtualAccount: VirtualAccount[] = useMemo(() => {
    if (isLoading) return maskDataTable;
    return data ?? [];
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
              page: pagination.page,
              pageSize: pagination.pageSize,
            },
            row.index
          )
        );
      },
    },
    {
      header: "Name",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        return isLoading ? <Skeleton /> : row.original.name;
      },
    },
    {
      header: "Take Rate",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const takeRate = (
          row.original as unknown as VirtualAccount & {
            commissionRule: {
              commissionDetails: {
                takeRate: number;
              };
            };
          }
        ).commissionRule?.commissionDetails?.takeRate;
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
        const balance = row.original.balance?.amountCents ?? 0;
        return isLoading ? <Skeleton /> : formatDollarByCent(balance);
      },
    },
    {
      header: "Spend",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const spend = row.original.spend?.amountCents ?? 0;
        return isLoading ? <Skeleton /> : formatDollarByCent(spend);
      },
    },
    {
      header: "Routing / Account",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const routingNumber = row.original.routingNumber ?? EMPTY_LABEL;
        const accountNumber = row.original.accountNumber ?? EMPTY_LABEL;
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
    {
      id: "telegram",
      header: (
        <div className="flex items-center gap-2">
          Telegram
          <Tooltip>
            <TooltipTrigger>
              <CopyIcon text={fakeIdTelegram} showText={false} />
            </TooltipTrigger>
            <TooltipContent
              style={{
                width: "200px",
              }}
            >
              Copy this id and add it to the group you want to receive
              notifications from, then take that group id and assign it to the
              virtual account you want to receive notifications from:{" "}
              {fakeIdTelegram}
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const telegram = row.original.linkedTelegramId;
        return isLoading ? (
          <Skeleton />
        ) : (
          <>
            <div className="flex items-center gap-2 hover-container">
              <span className="font-medium">Telegram:</span>{" "}
              <span
                className={cn(
                  "text-green-500 cursor-pointer",
                  telegram ? "" : "underline"
                )}
                onClick={() => {
                  setVirtualAccountEdit(row.original);
                  setOpenDrawer(true);
                }}
              >
                {telegram ? telegram : "Set ID"}
              </span>
            </div>
          </>
        );
      },
    },
  ] as ColumnDef<VirtualAccount>[];

  const handleCancelDrawer = () => {
    setOpenDrawer(false);
  };

  const handleSuccess = () => {
    setOpenDrawer(false);
    setCountGetList((prev) => prev + 1);
  };

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
          <FormLinkTelegram
            virtualAccount={virtualAccountEdit}
            openDrawer={openDrawer}
            onCancel={handleCancelDrawer}
            onSubmitSuccess={handleSuccess}
          />
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
