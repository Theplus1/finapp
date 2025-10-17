import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { EMPTY_LABEL } from "@/app/utils/constants";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Props = {
  virtualAccount: VirtualAccount | null;
  openDrawer: boolean;
  onCancel: () => void;
  onSubmitSuccess: () => void;
};

const FormLinkTelegram = ({
  virtualAccount,
  openDrawer,
  onCancel,
  onSubmitSuccess,
}: Props) => {
  const [telegramId, setTelegramId] = useState<number>(
    virtualAccount?.linkedTelegramId ?? 0
  );
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: linkTelegram } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.virtualAccounts
        .linkTelegram(virtualAccount!._id, {
          telegramId: telegramId!,
        })
        .then(() => {
          onSubmitSuccess();
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
    setTelegramId(virtualAccount.linkedTelegramId ?? 0);
  }, [openDrawer, virtualAccount]);

  const onSubmit = () => {
    if (!telegramId) {
      toast.error("Telegram ID is required");
      return;
    }
    linkTelegram();
  };

  const handleDrawerClose = () => {
    setTelegramId(0);
    onCancel();
  };

  const disableSubmit =
    isLoading || !telegramId || telegramId === virtualAccount?.linkedTelegramId;

  return (
    <Drawer direction="right" open={openDrawer}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Link telegram to virtual account &quot;
            {virtualAccount?.name ?? EMPTY_LABEL}&quot;
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Telegram ID
          </label>
          <Input
            placeholder="Enter telegram id"
            value={telegramId}
            onChange={(e) => {
              const value = e.target.value;
              const numericValue = value.replace(/[^0-9]/g, "");
              setTelegramId(numericValue ? Number(numericValue) : 0);
            }}
            onBlur={(e) => {
              setTelegramId(Number(e.target.value) || 0);
            }}
          />
        </div>
        <DrawerFooter className="px-4">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleDrawerClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              className={cn(
                "cursor-pointer",
                disableSubmit && "cursor-not-allowed opacity-50"
              )}
              onClick={!disableSubmit ? onSubmit : undefined}
            >
              {isLoading ? <Spinner /> : ""}
              Submit
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FormLinkTelegram;
