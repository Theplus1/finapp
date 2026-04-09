"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useBreadcrumbs } from "@/contexts/breadcrumb-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  formatCurrency,
  formatUtcMMDDYYYY,
  renderNoTable,
} from "@/app/utils/func";
import { PageHeader, PageTitle } from "@/components/layouts/page-header";
import { Section, SectionContent } from "@/components/layouts/section";
import { PageLayout } from "@/components/layouts/page-layout";
import {
  Card,
  CardStatus,
  DrawerCardTypeEnum,
  LimitPresetEnum,
} from "@/lib/api/endpoints/card";
import FilterCard from "./filter";
import { CellContext, ColumnDef } from "@tanstack/react-table";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { Skeleton } from "@repo/ui/components/skeleton";
import CardNameCol from "@repo/ui/components/card-name-col";
import { ClientPagination } from "@repo/ui/components/client-pagination";
import { DataTable } from "@repo/ui/components/data-table";
import { upperCaseFirstCharacter } from "@repo/ui/lib/func";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import FormActionCard from "./form-action-card";
import CardCVVCol from "./card-cvv-col";
import { useDebounce } from "@repo/ui/hooks/use-debounce";
import { RoleUserEnum, UserBoss } from "@/lib/api/endpoints/users";
import CVVHistoriesTaken from "./cvv-taken";
import { Switch } from "@repo/ui/components/switch";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { Button } from "@repo/ui/components/button";

const maskDataTable = Array.from({ length: 20 }, () => {
  return {};
}) as Card[];

const initCard: Card = {
  _id: "",
  slashId: "",
  isRecurringOnly: false,
  spendingLimit: {
    preset: LimitPresetEnum.DAILY,
    amount: 0,
  },
  cvvHistories: [],
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

const initEmployee: UserBoss = {
  id: "",
  username: "",
  role: RoleUserEnum.BOSS,
  email: "",
  isActive: false,
  bossId: "",
  virtualAccountId: "",
  createdAt: "",
  updatedAt: "",
};

export default function CardsPage() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const [cardEdit, setCardEdit] = useState<Card>(initCard);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [drawerType, setDrawerType] = useState<DrawerCardTypeEnum>(
    DrawerCardTypeEnum.SET_SPENDING_LIMIT,
  );
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState({});
  const [keywordCard, setKeywordCard] = useState("");
  const keywordCardDebounce = useDebounce(keywordCard, 300).toLowerCase();
  const [countGetList, setCountGetList] = useState(0);
  const [user, setUser] = useState<UserBoss>(initEmployee);
  const [cardLoadingStatus, setCardLoadingStatus] = useState<string | null>(
    null,
  );
  const [cardLoadingPreRecharge, setCardLoadingPreRecharge] = useState<
    string | null
  >(null);

  const isBoss = user.role === RoleUserEnum.BOSS;

  useEffect(() => {
    setBreadcrumbs([
      { label: "Dashboard", href: "/dashboard" },
      { label: "Card list", href: "/cards" },
    ]);
  }, [setBreadcrumbs]);

  useLayoutEffect(() => {
    const userLocalStorage = localStorage.getItem("user");
    if (userLocalStorage) {
      setUser(JSON.parse(userLocalStorage));
    }
  }, []);

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

  const searchIds = useMemo(() => {
    return keywordCardDebounce
      .split("\n")
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean);
  }, [keywordCardDebounce]);

  const dataCardGrouped = useMemo(() => {
    if (isLoading) return maskDataTable;
    if (searchIds.length === 0) return dataCard;
    return dataCard.filter((card) =>
      searchIds.some((id) => card.slashId?.toLowerCase().includes(id)),
    );
  }, [dataCard, isLoading, searchIds]);

  const handleActionVirtualAccount = (type: DrawerCardTypeEnum, card: Card) => {
    setCardEdit(card);
    setOpenDrawer(true);
    setDrawerType(type);
  };

  const handleChangeStatus = (card: Card) => {
    const isActivating = card.status === "active";
    setCardLoadingStatus(card.slashId);
    api.cards[isActivating ? "lockCard" : "unlockCard"](card.slashId)
      .then(() => {
        toast.success(
          isActivating
            ? "Card locked successfully"
            : "Card unlocked successfully",
        );

        setCountGetList((prev) => prev + 1);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to change card status");
      })
      .finally(() => {
        setCardLoadingStatus(null);
      });
  };
  const handleChangePreRecharge = (card: Card) => {
    const isSettedRecurring = card.isRecurringOnly;
    setCardLoadingPreRecharge(card.slashId);
    api.cards[isSettedRecurring ? "unsetRecurringOnly" : "setRecurringOnly"](
      card.slashId,
    )
      .then(() => {
        toast.success(
          isSettedRecurring
            ? "Card recurring only set successfully"
            : "Card recurring only unset successfully",
        );

        setCountGetList((prev) => prev + 1);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to change card pre-recharge status");
      })
      .finally(() => {
        setCardLoadingPreRecharge(null);
      });
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
      header: "Card ID",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? <Skeleton /> : <div>{row.original.slashId}</div>;
      },
    },
    {
      header: "Card Name",
      cell: ({ row }: CellContext<Card, string>) => {
        return isLoading ? <Skeleton /> : <CardNameCol card={row.original} />;
      },
    },
    {
      id: "cvv",
      header: <div className="text-center">Card Info</div>,
      cell: ({ row }: CellContext<Card, string>) => {
        if (isLoading) return <Skeleton />;
        return (
          <div className="text-center">
            <CardCVVCol card={row.original} />
          </div>
        );
      },
    },
    ...(isBoss
      ? [
          {
            header: <div className="text-center">Activity</div>,
            id: "card-activity",
            cell: ({ row }: CellContext<Card, string>) => {
              if (isLoading) return <Skeleton />;
              return (
                <div className="text-center">
                  <CVVHistoriesTaken card={row.original} />
                </div>
              );
            },
          },
        ]
      : []),
    {
      header: "Card Status",
      cell: ({ row }: CellContext<Card, string>) => {
        if (isLoading) return <Skeleton />;
        const isActive = row.original.status === "active";
        return (
          <div className="flex items-center gap-2">
            <span className="w-[60px]">{isActive ? "Active" : "Paused"}</span>
            {cardLoadingStatus === row.original.slashId ? (
              <Spinner />
            ) : (
              <Switch
                onCheckedChange={() => handleChangeStatus(row.original)}
                checked={isActive}
                className={"cursor-pointer"}
              />
            )}
          </div>
        );
      },
    },
    {
      header: "Recurring Payment Only",
      cell: ({ row }: CellContext<Card, string>) => {
        if (isLoading) {
          return <Skeleton />;
        }
        const isRecurringOnly = row.original.isRecurringOnly;
        return (
          <div className="flex items-center gap-2">
            <span className="w-[80px]">
              {isRecurringOnly ? "Allow" : "Not allow"}
            </span>
            {cardLoadingPreRecharge === row.original.slashId ? (
              <Spinner />
            ) : (
              <Switch
                onCheckedChange={() => handleChangePreRecharge(row.original)}
                checked={row.original.isRecurringOnly}
                className={"cursor-pointer"}
              />
            )}
          </div>
        );
      },
    },
    {
      header: "Spending Limit",
      cell: ({ row }: CellContext<Card, string>) => {
        if (isLoading) {
          return <Skeleton />;
        }
        const isUnlimited = row.original.spendingLimit?.preset === "unlimited";
        return (
          <Button
            variant={"link"}
            onClick={() =>
              handleActionVirtualAccount(
                DrawerCardTypeEnum.SET_SPENDING_LIMIT,
                row.original,
              )
            }
          >
            {isUnlimited
              ? "Unlimited"
              : `${upperCaseFirstCharacter(
                  row.original.spendingLimit?.preset ?? "",
                )}: ${formatCurrency(row.original.spendingLimit?.amount ?? 0)}`}
          </Button>
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
      case DrawerCardTypeEnum.SET_SPENDING_LIMIT:
        return (
          <>
            Set spending limit for card &quot;
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
    setCurrentFilter((prev) => ({
      ...prev,
      search: card,
    }));
  };

  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Card list</PageTitle>
      </PageHeader>

      <Section>
        <SectionContent>
          <FilterCard
            onStatusChange={(status) => handleChangeFilter("status", status)}
            onCardChange={handleChangeCard}
            keywordCard={keywordCard}
            currentFilter={currentFilter}
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
                onCancelDrawer={handleCancelDrawer}
                onSubmitCardSuccess={handleSuccessDrawer}
              />
            </DrawerContent>
          </Drawer>
        </SectionContent>
      </Section>
    </PageLayout>
  );
}
