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
import { Ellipsis } from "lucide-react";
import { PageLayout } from "@/components/layouts/page-layout";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { SectionContent } from "@/components/layouts/section";
import { Section } from "@/components/layouts/section";
import {
  DrawerTypeVirtualAccountEnum,
  type VirtualAccount,
} from "@/lib/api/endpoints/virtual-account";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { Skeleton } from "@repo/ui/components/skeleton";
import { DataTable } from "@repo/ui/components/data-table";
import { EMPTY_LABEL } from "@/app/utils/constants";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { CopyIcon } from "@repo/ui/components/copy-button";
import { ClientPagination } from "@repo/ui/components/client-pagination";
import FormLinkTelegram from "./(components)/form-link-telegram";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import ActionsTable from "./(components)/actions-table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import FormSetAccount from "./(components)/form-set-account";
import FormRecharge from "./(components)/form-recharge";
import FormRechargeHistories from "./(components)/form-recharge-histories";

const idTelegram = "@finnotisys_bot";
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
  const [drawerType, setDrawerType] = useState<DrawerTypeVirtualAccountEnum>(
    DrawerTypeVirtualAccountEnum.LINK_TELEGRAM,
  );
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
    queryKey: ["virtual-accounts", countGetList, pagination.page],
    queryFn: async () => {
      const res = await api.virtualAccounts.getVirtualAccounts({
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
  });

  const dataVirtualAccount: VirtualAccount[] = useMemo(() => {
    if (isLoading) return maskDataTable;
    return data ?? [];
  }, [isLoading, data]);

  const handleActionVirtualAccount = (
    type: DrawerTypeVirtualAccountEnum,
    virtualAccount: VirtualAccount,
  ) => {
    setVirtualAccountEdit(virtualAccount);
    setOpenDrawer(true);
    setDrawerType(type);
  };

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
            row.index,
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
      header: <p className={isLoading ? "" : "text-end"}>Balance</p>,
      id: "balance",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const balance = row.original.internalBalanceCents ?? 0;
        return isLoading ? (
          <Skeleton />
        ) : (
          <p className={"text-end"}>{formatDollarByCent(balance)}</p>
        );
      },
    },
    {
      header: <p className={isLoading ? "" : "text-end"}>Spend</p>,
      id: "spend",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const spend = row.original.internalSpendCents ?? 0;
        return isLoading ? (
          <Skeleton />
        ) : (
          <p className={"text-end"}>{formatDollarByCent(spend)}</p>
        );
      },
    },
    {
      header: <p className={isLoading ? "" : "text-end"}>Recharge</p>,
      id: "recharge",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const recharge = row.original.internalSpendCents ?? 0;
        return isLoading ? (
          <Skeleton />
        ) : (
          <p className={"text-end"}>{formatDollarByCent(recharge)}</p>
        );
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
    // {
    //   header: "Transfer",
    //   cell: ({ row }: CellContext<VirtualAccount, string>) => {
    //     return isLoading ? <Skeleton /> : formatDollarByCent(0);
    //   },
    // },
    // {
    //   header: "Recharge",
    //   cell: ({ row }: CellContext<VirtualAccount, string>) => {
    //     return isLoading ? <Skeleton /> : formatDollarByCent(0);
    //   },
    // },
    // {
    //   header: "Debt",
    //   cell: ({ row }: CellContext<VirtualAccount, string>) => {
    //     return isLoading ? <Skeleton /> : formatDollarByCent(0);
    //   },
    // },
    {
      id: "telegram",
      header: (
        <div className="flex items-center gap-2">
          Telegram
          <Tooltip>
            <TooltipTrigger>
              <CopyIcon text={idTelegram} showText={false} />
            </TooltipTrigger>
            <TooltipContent
              style={{
                width: "200px",
              }}
            >
              Copy this id and add it to the group you want to receive
              notifications from, then take that group id and assign it to the
              virtual account you want to receive notifications from:{" "}
              {idTelegram}
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        const telegram = row.original.linkedTelegramId;
        const telegrams = row.original.linkedTelegramIds ?? [];
        let renderMenyIdTelegram, renderIdTelegram, renderSetIds;
        if (telegrams.length > 0) {
          renderMenyIdTelegram = (
            <>
              {telegrams.map((telegram, index) => (
                <p
                  key={index}
                  className={cn(
                    "text-green-500 cursor-pointer block",
                    typeof telegram === "number" ? "" : "underline",
                  )}
                  onClick={() => {
                    handleActionVirtualAccount(
                      DrawerTypeVirtualAccountEnum.LINK_TELEGRAM,
                      row.original,
                    );
                  }}
                >
                  {telegram}
                </p>
              ))}
            </>
          );
        } else if (!!telegram) {
          renderIdTelegram = (
            <p
              key={telegram}
              className={cn(
                "text-green-500 cursor-pointer block",
                telegram ? "" : "underline",
              )}
              onClick={() => {
                handleActionVirtualAccount(
                  DrawerTypeVirtualAccountEnum.LINK_TELEGRAM,
                  row.original,
                );
              }}
            >
              {telegram}
            </p>
          );
        } else {
          renderSetIds = (
            <p
              className="text-green-500 cursor-pointer block underline"
              onClick={() => {
                handleActionVirtualAccount(
                  DrawerTypeVirtualAccountEnum.LINK_TELEGRAM,
                  row.original,
                );
              }}
            >
              Set IDs
            </p>
          );
        }

        return isLoading ? (
          <Skeleton />
        ) : (
          <>
            <div className="flex items-center gap-2 hover-container">
              <span className="font-medium">Telegrams:</span>{" "}
              <div>
                {renderMenyIdTelegram || renderIdTelegram || renderSetIds}
              </div>
            </div>
          </>
        );
      },
    },
    {
      header: <p className="text-center">Boss</p>,
      id: "boss",
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        if (isLoading) {
          return <Skeleton />;
        }
        const isConnectedBoss = !!row.original.bossUsername;
        return isLoading ? (
          <Skeleton />
        ) : (
          <div className="text-center">
            {isConnectedBoss ? (
              <>
                <p>{row.original.bossUsername}</p>
                <p>{row.original.bossEmail}</p>
              </>
            ) : (
              EMPTY_LABEL
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: <p className="text-center">Actions</p>,
      cell: ({ row }: CellContext<VirtualAccount, string>) => {
        return (
          <div className="flex justify-center">
            <Popover>
              <PopoverTrigger className="cursor-pointer">
                <Ellipsis />
              </PopoverTrigger>
              <PopoverContent>
                <ActionsTable
                  virtualAccount={row.original}
                  onClickAction={(type) =>
                    handleActionVirtualAccount(type, row.original)
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      },
    },
  ] as ColumnDef<VirtualAccount>[];

  const handleCancelDrawer = () => {
    setOpenDrawer(false);
  };

  const handleSuccessDrawer = () => {
    setOpenDrawer(false);
    setCountGetList((prev) => prev + 1);
  };

  const renderTitleDrawer = (typeDrawer: DrawerTypeVirtualAccountEnum) => {
    switch (typeDrawer) {
      case DrawerTypeVirtualAccountEnum.LINK_TELEGRAM:
        return (
          <>
            Link telegram to virtual account &quot;
            {virtualAccountEdit?.name ?? EMPTY_LABEL}&quot;
          </>
        );
      case DrawerTypeVirtualAccountEnum.SET_ACCOUNT:
        return (
          <>
            Set account to virtual account &quot;
            {virtualAccountEdit?.name ?? EMPTY_LABEL}&quot;
          </>
        );
      case DrawerTypeVirtualAccountEnum.RECHARGE:
        return (
          <>
            Deposit virtual account &quot;
            {virtualAccountEdit?.name ?? EMPTY_LABEL}&quot;
          </>
        );

      case DrawerTypeVirtualAccountEnum.RECHARGE_HISTORY:
        return (
          <>
            Deposit history virtual account &quot;
            {virtualAccountEdit?.name ?? EMPTY_LABEL}&quot;
          </>
        );
      default:
        return "";
    }
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
          <Drawer direction="right" open={openDrawer}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{renderTitleDrawer(drawerType)}</DrawerTitle>
              </DrawerHeader>
              {drawerType === DrawerTypeVirtualAccountEnum.LINK_TELEGRAM && (
                <FormLinkTelegram
                  virtualAccount={virtualAccountEdit}
                  openDrawer={openDrawer}
                  onCancelSetTelegram={handleCancelDrawer}
                  onSubmitTelegramSuccess={handleSuccessDrawer}
                />
              )}
              {drawerType === DrawerTypeVirtualAccountEnum.SET_ACCOUNT && (
                <FormSetAccount
                  virtualAccount={virtualAccountEdit}
                  openDrawer={openDrawer}
                  onCancelSetAccount={handleCancelDrawer}
                  onSubmitAccountSuccess={handleSuccessDrawer}
                />
              )}
              {drawerType === DrawerTypeVirtualAccountEnum.RECHARGE && (
                <FormRecharge
                  virtualAccount={virtualAccountEdit}
                  openDrawer={openDrawer}
                  onCancelRecharge={handleCancelDrawer}
                  onSubmitRechargeSuccess={handleSuccessDrawer}
                />
              )}
              {drawerType === DrawerTypeVirtualAccountEnum.RECHARGE_HISTORY && (
                <FormRechargeHistories
                  virtualAccount={virtualAccountEdit}
                  countGetList={countGetList}
                  handleDrawerClose={handleCancelDrawer}
                />
              )}
            </DrawerContent>
          </Drawer>
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
