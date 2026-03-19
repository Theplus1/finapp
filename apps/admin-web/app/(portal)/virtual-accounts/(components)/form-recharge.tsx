import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import { DatePicker } from "@repo/ui/components/date-picker";

type Props = {
  virtualAccount: VirtualAccount | null;
  openDrawer: boolean;
  onCancelRecharge: () => void;
  onSubmitRechargeSuccess: () => void;
};

const FormRecharge = ({
  virtualAccount,
  openDrawer,
  onCancelRecharge,
  onSubmitRechargeSuccess,
}: Props) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [amount, setAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: deposit } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.virtualAccounts
        .dailyDeposit(virtualAccount!.slashId, {
          // date format YYYY-MM-DD
          date: new Date(date!).toLocaleDateString("en-CA"),
          depositAmount: amount,
        })
        .then(() => {
          toast.success("Deposit created successfully");
          onSubmitRechargeSuccess();
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
    if (!virtualAccount || !openDrawer) {
      return;
    }
    setDate(undefined);
  }, [openDrawer, virtualAccount]);

  const handleDrawerClose = () => {
    setDate(undefined);
    setAmount(0);
    onCancelRecharge();
  };

  const disableSubmit = isLoading || !date || !amount;

  return (
    <>
      <div className="px-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <DatePicker
            onChange={(date) => {
              setDate(date);
            }}
            label={
              <span className="text-sm font-medium text-muted-foreground">
                Date deposit
              </span>
            }
            triggerClassName="w-full"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Amount ($)
          </label>
          <Input
            placeholder="Enter amount"
            value={amount}
            type="number"
            onChange={(e) => {
              const value = e.target.value;
              setAmount(Number(value));
            }}
          />
        </div>
      </div>
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleDrawerClose}>
            Cancel
          </Button>
          <Button
            className={cn(disableSubmit && "cursor-not-allowed opacity-50")}
            onClick={!disableSubmit ? (deposit as () => void) : undefined}
          >
            {isLoading ? <Spinner /> : ""}
            Submit
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormRecharge;
