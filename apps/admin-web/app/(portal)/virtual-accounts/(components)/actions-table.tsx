import { Button } from "@repo/ui/components/button";
import { History, Plus, Settings, Pencil, Trash2, Link } from "lucide-react";
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
  allVirtualAccounts: VirtualAccount[];
  onRefresh: () => void;
};

const ActionsTable = ({ onClickAction, virtualAccount, allVirtualAccounts, onRefresh }: Props) => {
  const [deletingBoss, setDeletingBoss] = useState(false);
  const [addingToBoss, setAddingToBoss] = useState(false);
  const [showBossList, setShowBossList] = useState(false);

  // Get unique bosses from all VAs
  const existingBosses = allVirtualAccounts
    .filter((va) => va.bossId && va.bossUsername)
    .reduce((acc, va) => {
      if (!acc.find((b) => b.bossId === va.bossId)) {
        acc.push({ bossId: va.bossId!, bossUsername: va.bossUsername! });
      }
      return acc;
    }, [] as { bossId: string; bossUsername: string }[]);

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

  const handleAddToBoss = async (bossId: string) => {
    setAddingToBoss(true);
    try {
      await api.virtualAccounts.addVaToBoss(bossId, virtualAccount.slashId);
      toast.success("VA added to boss");
      setShowBossList(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to add VA to boss");
    } finally {
      setAddingToBoss(false);
    }
  };

  const handleRemoveFromBoss = async () => {
    if (!virtualAccount.bossId) return;
    if (!window.confirm(`Gỡ VA "${virtualAccount.name}" khỏi boss "${virtualAccount.bossUsername}"?`)) return;
    setAddingToBoss(true);
    try {
      await api.virtualAccounts.removeVaFromBoss(virtualAccount.bossId, virtualAccount.slashId);
      toast.success("VA removed from boss");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove VA from boss");
    } finally {
      setAddingToBoss(false);
    }
  };

  return (
    <div className="grid gap-2">
      {!virtualAccount.bossUsername ? (
        <>
          <Button
            variant="outline"
            onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.SET_ACCOUNT)}
          >
            <Settings data-icon="inline-start" />
            Set boss account
          </Button>
          {existingBosses.length > 0 && !showBossList && (
            <Button variant="outline" onClick={() => setShowBossList(true)}>
              <Link data-icon="inline-start" />
              Add to existing boss
            </Button>
          )}
          {showBossList && (
            <div className="flex flex-col gap-1 border rounded-md p-2">
              <p className="text-xs text-muted-foreground mb-1">Select boss:</p>
              {existingBosses.map((boss) => (
                <Button
                  key={boss.bossId}
                  variant="ghost"
                  size="sm"
                  disabled={addingToBoss}
                  onClick={() => handleAddToBoss(boss.bossId)}
                >
                  {boss.bossUsername}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setShowBossList(false)}>
                Cancel
              </Button>
            </div>
          )}
        </>
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
            variant="outline"
            onClick={handleRemoveFromBoss}
            disabled={addingToBoss}
          >
            <Link data-icon="inline-start" />
            Remove VA from boss
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
