"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatUtcMMDDYYYY, renderNoTable } from "@/app/utils/func";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import type { Card } from "@/lib/api/endpoints/card";
import FilterCard from "./components/filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { Skeleton } from "@repo/ui/components/skeleton";
import CardNameCol from "@repo/ui/components/card-name-col";
import { ClientPagination } from "@repo/ui/components/client-pagination";
import { DataTable } from "@repo/ui/components/data-table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import ActionsTable, { DrawerCardType } from "./components/actions-table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import FormActionCard from "./components/form-action-card";

const initFilter = {
  status: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Card[];

export default function Cards() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [cardEdit, setCardEdit] = useState<Card | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerCardType>("lock");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState(initFilter);
  const [countGetList, setCountGetList] = useState(0);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Cards", href: "/cards" },
    ]);
  }, [setBreadcrumbs]);

  const { data: cardInfors, isLoading } = useQuery({
    queryKey: ["cards", pagination.page, currentFilter, countGetList],
    queryFn: async () => {
      const res = await api.cards.getCards({
        ...currentFilter,
        page: pagination.page,
        limit: pagination.pageSize,
      });
      setPagination((prev) => ({
        ...prev,
        total: res.pagination?.total ?? 0,
      }));
      return res;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const dataCard: Card[] = useMemo(() => cardInfors?.data ?? [], [cardInfors]);

  const dataCardGrouped = useMemo(
    () => (isLoading ? maskDataTable : dataCard),
    [dataCard, isLoading],
  );

  const handleActionVirtualAccount = (type: DrawerCardType, card: Card) => {
    setCardEdit(card);
    setOpenDrawer(true);
    setDrawerType(type);
  };

  const columns = [
    {
      header: "No",
      cell: ({ row }: CellContext<Card, number>) => {
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
      header: "Card Name",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? <Skeleton /> : <CardNameCol card={row.original} />;
      },
    },
    {
      header: "Status",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          <span className="capitalize">{row.original.status}</span>
        );
      },
    },
    {
      header: "Created",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          formatUtcMMDDYYYY(row.original.createdAt)
        );
      },
    },
    {
      header: "Expiry",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : (
          `${row.original.expiryMonth}/${row.original.expiryYear}`
        );
      },
    },
    {
      id: "actions",
      header: <p className="text-center">Actions</p>,
      cell: ({ row }: CellContext<Card, string>) => {
        return (
          <div className="flex justify-center">
            <Popover>
              <PopoverTrigger className="cursor-pointer">...</PopoverTrigger>
              <PopoverContent>
                <ActionsTable
                  card={row.original}
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
  ] as ColumnDef<Card>[];

  const handleChangeFilter = (field: string, value: string) => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
    setCurrentFilter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const renderTitleDrawer = (typeDrawer: DrawerCardType) => {
    switch (typeDrawer) {
      case "lock":
        return (
          <>
            Lock card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case "unlock":
        return (
          <>
            Unlock card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case "set-pre-recharge":
        return (
          <>
            Set pre-recharge for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case "set-spending-limit":
        return (
          <>
            Set spending limit for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case "unset-pre-recharge":
        return (
          <>
            Unset pre-recharge for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case "unset-spending-limit":
        return (
          <>
            Unset spending limit for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      default:
        return "";
    }
  };
  const handleCancelDrawer = () => {
    setOpenDrawer(false);
  };

  const handleSuccessDrawer = () => {
    setOpenDrawer(false);
    setCountGetList((prev) => prev + 1);
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Cards</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCard
            onStatusChange={(status) => handleChangeFilter("status", status)}
          />
          <DataTable
            columns={columns}
            data={dataCardGrouped}
            maxHeight={"70vh"}
          />
          <ClientPagination
            total={pagination.total}
            page={pagination.page}
            pageSize={pagination.pageSize}
            onChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          />
          <Drawer direction="right" open={openDrawer}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>
                  {renderTitleDrawer(drawerType || "lock-card")}
                </DrawerTitle>
              </DrawerHeader>
              <FormActionCard
                card={cardEdit}
                openDrawer={openDrawer}
                onCancelDrawer={handleCancelDrawer}
                onSubmitCardSuccess={handleSuccessDrawer}
                drawerType={drawerType}
              />
            </DrawerContent>
          </Drawer>
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
