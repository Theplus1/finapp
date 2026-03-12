import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import {
  Card,
  DrawerCardTypeEnum,
  LimitPreset,
} from "@/lib/api/endpoints/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Input } from "@repo/ui/components/input";

type Props = {
  card: Card;
  openDrawer: boolean;
  onCancelDrawer: () => void;
  onSubmitCardSuccess: () => void;
  drawerType: DrawerCardTypeEnum;
};

const FormActionCard = ({
  card,
  openDrawer,
  onCancelDrawer,
  onSubmitCardSuccess,
  drawerType,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [presetLimit, setPresetLimit] = useState<LimitPreset>(
    LimitPreset.DAILY,
  );
  const [amountLimit, setAmountLimit] = useState<number>(0);

  const { mutateAsync: lockCard } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .lockCard(card.slashId)
        .then(() => {
          toast.success("Card locked successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const { mutateAsync: unlockCard } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .unlockCard(card.slashId)
        .then(() => {
          toast.success("Card unlocked successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const { mutateAsync: setPreRecharge } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .setRecurringOnly(card.slashId)
        .then(() => {
          toast.success("Card pre-recharge set successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const { mutateAsync: unsetPreRecharge } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .unsetRecurringOnly(card.slashId)
        .then(() => {
          toast.success("Card recurring only unset successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const { mutateAsync: setSpendingLimit } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .setLimit(card.slashId, presetLimit, amountLimit)
        .then(() => {
          toast.success("Card spending limit set successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  const { mutateAsync: unsetSpendingLimit } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.cards
        .unsetLimit(card.slashId)
        .then(() => {
          toast.success("Card spending limit unset successfully");
          onSubmitCardSuccess();
          onCancelDrawer();
        })
        .catch((error) => {
          toast.error(error.message);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  return (
    <>
      {drawerType === "set-spending-limit" && (
        <>
          <div className="px-4 flex flex-col gap-2">
            <label className="block text-sm font-medium text-muted-foreground">
              Select a preset
            </label>
            <Select
              value={presetLimit}
              onValueChange={(value) => setPresetLimit(value as LimitPreset)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LimitPreset.DAILY}>Daily</SelectItem>
                <SelectItem value={LimitPreset.WEEKLY}>Weekly</SelectItem>
                <SelectItem value={LimitPreset.MONTHLY}>Monthly</SelectItem>
                <SelectItem value={LimitPreset.YEARLY}>Yearly</SelectItem>
                <SelectItem value={LimitPreset.COLLECTIVE}>
                  Collective
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="px-4 flex flex-col gap-2 mt-4">
            <label className="block text-sm font-medium text-muted-foreground">
              Amount ($)
            </label>
            <Input
              type="number"
              value={amountLimit}
              onChange={(e) => setAmountLimit(Number(e.target.value))}
            />
          </div>
        </>
      )}
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancelDrawer}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "cursor-pointer",
              isLoading && "cursor-not-allowed opacity-50",
            )}
            onClick={
              !isLoading
                ? () => {
                    if (drawerType === DrawerCardTypeEnum.LOCK) {
                      lockCard();
                    } else if (drawerType === DrawerCardTypeEnum.UNLOCK) {
                      unlockCard();
                    } else if (
                      drawerType === DrawerCardTypeEnum.SET_PRE_RECHARGE
                    ) {
                      setPreRecharge();
                    } else if (
                      drawerType === DrawerCardTypeEnum.UNSET_PRE_RECHARGE
                    ) {
                      unsetPreRecharge();
                    } else if (
                      drawerType === DrawerCardTypeEnum.SET_SPENDING_LIMIT
                    ) {
                      setSpendingLimit();
                    } else if (
                      drawerType === DrawerCardTypeEnum.UNSET_SPENDING_LIMIT
                    ) {
                      unsetSpendingLimit();
                    }
                  }
                : undefined
            }
          >
            {isLoading ? <Spinner /> : ""}
            Confirm
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormActionCard;
