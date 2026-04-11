import { DrawerFooter } from "@repo/ui/components/drawer";
import { Button } from "@repo/ui/components/button";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@/lib/utils";
import { CirclePlus, Info, Trash } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Field } from "@repo/ui/components/field";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";

const maxLengthIdTelegram = 15;

type Props = {
  virtualAccount: VirtualAccount | null;
  openDrawer: boolean;
  onCancelSetTelegram: () => void;
  onSubmitTelegramSuccess: () => void;
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
  onCancelSetTelegram,
  onSubmitTelegramSuccess,
}: Props) => {
  const initTelegramsIds = renderTelegramsIds(virtualAccount!);
  const [telegramIds, setTelegramIds] = useState<number[]>(initTelegramsIds);
  const [isLoading, setIsLoading] = useState(false);

  const { mutateAsync: linkTelegram } = useMutation({
    mutationFn: async () => {
      if (telegramIds.includes(0)) {
        toast.error("Telegram ID cannot be 0");
        return;
      }
      if (telegramIds.length !== new Set(telegramIds).size) {
        toast.error("Telegram ID cannot be duplicated");
        return;
      }
      setIsLoading(true);
      try {
        await api.virtualAccounts.linkTelegram(virtualAccount!._id, {
          telegramIds: telegramIds,
        });
        toast.success("Telegram linked successfully");
        onSubmitTelegramSuccess();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
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
    onCancelSetTelegram();
  };

  const handleAddTelegramId = () => {
    setTelegramIds([...telegramIds, 0]);
  };

  const handleRemoveTelegramId = (index: number) => {
    setTelegramIds(telegramIds.filter((_, i) => i !== index));
  };

  const handleChangeTelegramId = (value: string, index: number) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setTelegramIds((prev) => {
      const newIds = [...prev];
      newIds[index] = Number(numericValue);
      return newIds;
    });
  };

  return (
    <>
      <div className="px-4 flex flex-col gap-2">
        <FormItemWrapper
          label="Telegram IDs"
          labelClassName="text-sm font-medium text-muted-foreground"
        >
          {telegramIds.map((id, index) => {
            const progress = (id.toString().length / maxLengthIdTelegram) * 100;
            const isZeroId = id === 0;
            const isDuplicateId = telegramIds.some(
              (telegramId, idx) => telegramId === id && idx !== index,
            );
            return (
              <div key={index} className="flex items-center gap-3">
                <Field data-invalid={isZeroId || isDuplicateId}>
                  <InputGroup className="pr-1">
                    <InputGroupInput
                      placeholder="Enter telegram id"
                      value={id}
                      maxLength={maxLengthIdTelegram}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleChangeTelegramId(value, index);
                      }}
                      onBlur={(e) => {
                        setTelegramIds((prev) => {
                          const newIds = [...prev];
                          newIds[index] = Number(e.target.value) || 0;
                          return newIds;
                        });
                      }}
                    />
                    <InputGroupAddon align={"inline-end"}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info
                            size={16}
                            opacity={progress === 100 ? 1 : 0}
                            style={{
                              transition: "opacity 0.3s ease",
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          Reached maximum {maxLengthIdTelegram} characters
                        </TooltipContent>
                      </Tooltip>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Trash
                  size={22}
                  className="cursor-pointer"
                  onClick={() => handleRemoveTelegramId(index)}
                />
              </div>
            );
          })}
          <CirclePlus
            size={22}
            className="text-muted-foreground cursor-pointer mt-4"
            onClick={handleAddTelegramId}
          />
        </FormItemWrapper>
      </div>
      <DrawerFooter className="px-4">
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleDrawerClose}>
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            className={cn(isLoading && "cursor-not-allowed opacity-50")}
            onClick={onSubmit}
          >
            {isLoading ? <Spinner /> : ""}
            Submit
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};

export default FormLinkTelegram;
