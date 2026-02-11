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
import { CirclePlus, Trash } from "lucide-react";

type Props = {
  virtualAccount: VirtualAccount | null;
  openDrawer: boolean;
  onCancel: () => void;
  onSubmitSuccess: () => void;
};

const renderTelegramsIds = (virtualAccount: VirtualAccount) => {
  let initTelegramsIds;
  if (virtualAccount?.linkedTelegramIds?.length) {
    initTelegramsIds = virtualAccount.linkedTelegramIds;
  } else if (virtualAccount?.linkedTelegramId) {
    initTelegramsIds = [virtualAccount.linkedTelegramId];
  } else {
    initTelegramsIds = [0];
  }
  return initTelegramsIds;
};

const FormLinkTelegram = ({
  virtualAccount,
  openDrawer,
  onCancel,
  onSubmitSuccess,
}: Props) => {
  const initTelegramsIds = renderTelegramsIds(virtualAccount!);
  const [telegramIds, setTelegramIds] = useState<number[]>(initTelegramsIds);
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: linkTelegram } = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      api.virtualAccounts
        .linkTelegram(virtualAccount!._id, {
          telegramIds: telegramIds,
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
    setTelegramIds(initTelegramsIds);
  }, [openDrawer, virtualAccount]);

  const onSubmit = () => {
    if (!telegramIds) {
      toast.error("Telegram ID is required");
      return;
    }
    linkTelegram();
  };

  const handleDrawerClose = () => {
    setTelegramIds([0]);
    onCancel();
  };

  const disableSubmit =
    isLoading ||
    (telegramIds.length === virtualAccount?.linkedTelegramIds?.length &&
      telegramIds.every((id) =>
        virtualAccount?.linkedTelegramIds?.some(
          (telegramId) => telegramId === id,
        ),
      ));

  const handleAddTelegramId = () => {
    setTelegramIds([...telegramIds, 0]);
  };

  const handleRemoveTelegramId = (index: number) => {
    setTelegramIds(telegramIds.filter((_, i) => i !== index));
  };

  return (
    <Drawer direction="right" open={openDrawer}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Link telegrams to virtual account &quot;
            {virtualAccount?.name ?? EMPTY_LABEL}&quot;
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 flex flex-col gap-2">
          <label className="block text-sm font-medium text-muted-foreground">
            Telegram IDs
          </label>
          {telegramIds.map((id, index) => (
            <div key={index} className="flex items-center gap-3">
              <Input
                placeholder="Enter telegram id"
                value={id}
                onChange={(e) => {
                  const value = e.target.value;
                  const numericValue = value.replace(/[^0-9]/g, "");
                  setTelegramIds((prev) => {
                    const newIds = [...prev];
                    newIds[index] = Number(numericValue);
                    return newIds;
                  });
                }}
                onBlur={(e) => {
                  setTelegramIds((prev) => {
                    const newIds = [...prev];
                    newIds[index] = Number(e.target.value) || 0;
                    return newIds;
                  });
                }}
              />
              <Trash
                size={22}
                className="cursor-pointer"
                onClick={() => handleRemoveTelegramId(index)}
              />
            </div>
          ))}
          <CirclePlus
            size={22}
            className="text-muted-foreground cursor-pointer mt-4"
            onClick={handleAddTelegramId}
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
                disableSubmit && "cursor-not-allowed opacity-50",
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
