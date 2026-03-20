import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import {
  Card,
  DrawerCardTypeEnum,
  LimitPresetEnum,
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
  onCancelDrawer: () => void;
  onSubmitCardSuccess: () => void;
};

const FormActionCard = ({
  card,
  onCancelDrawer,
  onSubmitCardSuccess,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [presetLimit, setPresetLimit] = useState<LimitPresetEnum>(
    LimitPresetEnum.DAILY,
  );
  const [amountLimit, setAmountLimit] = useState<number>(0);

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

  useEffect(() => {
    setPresetLimit(card.spendingLimit?.preset ?? LimitPresetEnum.UNLIMITED);
    setAmountLimit(card.spendingLimit?.amount ?? 0);
  }, [card]);

  const isUnSet = presetLimit === LimitPresetEnum.UNLIMITED;

  return (
    <>
      <div className="px-4 flex flex-col gap-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Select a preset
        </label>
        <Select
          value={presetLimit}
          onValueChange={(value) => setPresetLimit(value as LimitPresetEnum)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a preset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LimitPresetEnum.DAILY}>Daily</SelectItem>
            <SelectItem value={LimitPresetEnum.WEEKLY}>Weekly</SelectItem>
            <SelectItem value={LimitPresetEnum.MONTHLY}>Monthly</SelectItem>
            <SelectItem value={LimitPresetEnum.YEARLY}>Yearly</SelectItem>
            <SelectItem value={LimitPresetEnum.COLLECTIVE}>
              Collective
            </SelectItem>
            <SelectItem value={LimitPresetEnum.UNLIMITED}>Unlimited</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div
        className={`${isUnSet ? "hidden" : ""} px-4 flex flex-col gap-2 mt-4`}
      >
        <label className="block text-sm font-medium text-muted-foreground">
          Amount ($)
        </label>
        <Input
          type="number"
          value={amountLimit}
          onChange={(e) => setAmountLimit(Number(e.target.value))}
        />
      </div>
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelDrawer}>
            Cancel
          </Button>
          <Button
            className={cn(isLoading && "cursor-not-allowed opacity-50")}
            onClick={
              !isLoading
                ? () => {
                    if (!isUnSet) {
                      setSpendingLimit();
                    } else {
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
