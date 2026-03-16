"use client";

import { useEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatUtcMMDDYYYY, renderNoTable } from "@/app/utils/func";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import { Card, CardStatus, DrawerCardTypeEnum } from "@/lib/api/endpoints/card";
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
import ActionsTable from "./components/actions-table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import FormActionCard from "./components/form-action-card";
import CardCVVCol from "./components/card-cvv-col";
import { useDebounce } from "@repo/ui/hooks/use-debounce";

const initFilter = {
  status: "",
};

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Card[];

const initCard: Card = {
  _id: "",
  slashId: "",
  __v: 0,
  accountId: "",
  cardGroupId: "",
  cardGroup: {
    slashId: "",
    name: "",
  },
  createdAt: "",
  expiryMonth: "",
  expiryYear: "",
  isDeleted: false,
  isPhysical: false,
  isSingleUse: false,
  last4: "",
  lastSyncedAt: "",
  name: "",
  status: CardStatus.ACTIVE,
  syncSource: "",
  updatedAt: "",
  virtualAccountId: "",
  virtualAccount: {
    slashId: "",
    name: "",
  },
};

export default function Cards() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [cardEdit, setCardEdit] = useState<Card>(initCard);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerCardTypeEnum>(
    DrawerCardTypeEnum.LOCK,
  );
  const [transGettedCVV, setTransGettedCVV] = useState<Record<string, string>>(
    {},
  );
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState(initFilter);
  const [keywordCard, setKeywordCard] = useState("");
  const keywordCardDebounce = useDebounce(keywordCard, 300).toLowerCase();
  const [countGetList, setCountGetList] = useState(0);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Cards", href: "/cards" },
    ]);
  }, [setBreadcrumbs]);

  const { data: cardInfors, isLoading } = useQuery({
    queryKey: [
      "cards",
      pagination.page,
      currentFilter,
      countGetList,
      keywordCardDebounce,
    ],
    queryFn: async () => {
      const res = await api.cards.getCards({
        ...currentFilter,
        page: pagination.page,
        limit: pagination.pageSize,
        search: keywordCardDebounce,
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

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      search: keywordCardDebounce,
    }));
  }, [keywordCardDebounce]);

  const dataCard: Card[] = useMemo(() => cardInfors?.data ?? [], [cardInfors]);

  const dataCardGrouped = useMemo(
    () => (isLoading ? maskDataTable : dataCard),
    [dataCard, isLoading],
  );

  const handleActionVirtualAccount = (type: DrawerCardTypeEnum, card: Card) => {
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
      header: "CVV",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? (
          <Skeleton />
        ) : transGettedCVV[row.original._id] ? (
          transGettedCVV[row.original._id]
        ) : (
          <CardCVVCol
            card={row.original}
            onGetCodeSuccess={(cvv) => {
              setTransGettedCVV((prev) => ({
                ...prev,
                [row.original._id]: cvv,
              }));
            }}
          />
        );
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
  const renderTitleDrawer = (typeDrawer: DrawerCardTypeEnum) => {
    switch (typeDrawer) {
      case DrawerCardTypeEnum.LOCK:
        return (
          <>
            Lock card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case DrawerCardTypeEnum.UNLOCK:
        return (
          <>
            Unlock card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case DrawerCardTypeEnum.SET_PRE_RECHARGE:
        return (
          <>
            Set pre-recharge for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case DrawerCardTypeEnum.SET_SPENDING_LIMIT:
        return (
          <>
            Set spending limit for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case DrawerCardTypeEnum.UNSET_PRE_RECHARGE:
        return (
          <>
            Unset pre-recharge for card &quot;
            {cardEdit?.name ?? EMPTY_LABEL}&quot; ?
          </>
        );
      case DrawerCardTypeEnum.UNSET_SPENDING_LIMIT:
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

  const handleChangeCard = (card: string) => {
    setKeywordCard(card);
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
            onCardChange={handleChangeCard}
            keywordCard={keywordCard}
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
