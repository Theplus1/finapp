import { formatDollarByCent, formatUtcMMDDYYYY } from "@/app/utils/func";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ItemTitle,
  ItemDescription,
  ItemContent,
  Item,
  ItemActions,
} from "@repo/ui/components/item";
import { api } from "@/lib/api";
import { DataRechargeHistory } from "@/lib/api/endpoints/virtual-account";
import { useState } from "react";
import { Spinner } from "@repo/ui/components/spinner";

type Props = {
  virtualAccountId: string;
  item: DataRechargeHistory;
  onDeleteSuccess?: () => void;
};

const DepositHistoryItem = ({
  virtualAccountId,
  item,
  onDeleteSuccess,
}: Props) => {
  const [loadingDelete, setLoadingDelete] = useState(false);

  const onClickDelete = () => {
    const confirmed = confirm("Are you sure you want to delete this deposit?");
    if (confirmed) {
      setLoadingDelete(true);
      api.virtualAccounts
        .deleteDailyDeposit(virtualAccountId, item.id)
        .then(() => {
          toast.success("Deposit deleted successfully");
          onDeleteSuccess?.();
        })
        .catch(() => {
          toast.error("Failed to delete deposit");
        })
        .finally(() => {
          setLoadingDelete(false);
        });
    }
  };

  return (
    <Item variant="outline" className="relative">
      <ItemContent>
        <ItemTitle className="text-lg">
          {formatDollarByCent(item.amountCents)}
        </ItemTitle>
        <ItemDescription>{formatUtcMMDDYYYY(item.date)}</ItemDescription>
      </ItemContent>
      <ItemActions className="absolute top-[10px] right-[10px]">
        {loadingDelete ? (
          <Spinner fontSize={18} />
        ) : (
          <Trash2
            size={18}
            onClick={onClickDelete}
            className="cursor-pointer"
          />
        )}
      </ItemActions>
      <ItemActions className="absolute bottom-[10px] right-[10px]">
        <div>Created: {formatUtcMMDDYYYY(item.createdAt)}</div>
      </ItemActions>
    </Item>
  );
};

export default DepositHistoryItem;
