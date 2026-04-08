import { Button } from "@repo/ui/components/button";
import { History, Plus, Settings, Pencil, Trash2 } from "lucide-react";
import {
  DrawerTypeVirtualAccountEnum,
  VirtualAccount,
} from "@/lib/api/endpoints/virtual-account";
import ActionResetPassword from "./action-reset-password";
import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  onClickAction: (type: DrawerTypeVirtualAccountEnum) => void;
  virtualAccount: VirtualAccount;
  onRefresh: () => void;
};

const ActionsTable = ({ onClickAction, virtualAccount, onRefresh }: Props) => {
  const [deletingBoss, setDeletingBoss] = useState(false);

  const handleDeleteBoss = async () => {
    if (!virtualAccount.bossId) return;
    if (!window.confirm(`Xóa boss "${virtualAccount.bossUsername}" vĩnh viễn?`)) return;
    setDeletingBoss(true);
    try {
      await api.virtualAccounts.deleteBoss(virtualAccount.bossId);
      toast.success("Boss deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete boss");
    } finally {
      setDeletingBoss(false);
    }
  };

  return (
    <div className="grid gap-2">
      {!virtualAccount.bossUsername ? (
        <Button
          variant="outline"
          onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.SET_ACCOUNT)}
        >
          <Settings data-icon="inline-start" />
          Set boss account
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.SET_ACCOUNT)}
          >
            <Pencil data-icon="inline-start" />
            Edit boss
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteBoss}
            disabled={deletingBoss}
          >
            <Trash2 data-icon="inline-start" />
            {deletingBoss ? "Deleting..." : "Delete boss"}
          </Button>
        </>
      )}
      <ActionResetPassword virtualAccount={virtualAccount} />
      <Button
        variant="outline"
        onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.RECHARGE)}
      >
        <Plus data-icon="inline-start" />
        Recharge
      </Button>
      <Button
        variant="outline"
        onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.RECHARGE_HISTORY)}
      >
        <History data-icon="inline-start" />
        Charge histories
      </Button>
    </div>
  );
};

export default ActionsTable;
