import { Button } from "@repo/ui/components/button";
import { History, KeyRound, Plus, Settings } from "lucide-react";
import {
  DrawerTypeVirtualAccountEnum,
  VirtualAccount,
} from "@/lib/api/endpoints/virtual-account";
import ActionResetPassword from "./action-reset-password";

type Props = {
  onClickAction: (type: DrawerTypeVirtualAccountEnum) => void;
  virtualAccount: VirtualAccount;
};

const ActionsTable = ({ onClickAction, virtualAccount }: Props) => {
  return (
    <div>
      <div className="grid gap-2">
        <Button
          variant={"outline"}
          size={"default"}
          className={!!virtualAccount.bossUsername ? "cursor-not-allowed" : ""}
          onClick={() =>
            !!virtualAccount.bossUsername
              ? undefined
              : onClickAction(DrawerTypeVirtualAccountEnum.SET_ACCOUNT)
          }
        >
          <Settings data-icon="inline-start" />
          Set boss account
        </Button>
        <ActionResetPassword virtualAccount={virtualAccount} />
        <Button
          variant={"outline"}
          size={"default"}
          onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.RECHARGE)}
        >
          <Plus data-icon="inline-start" />
          Recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          onClick={() =>
            onClickAction(DrawerTypeVirtualAccountEnum.RECHARGE_HISTORY)
          }
        >
          <History data-icon="inline-start" />
          Charge histories
        </Button>
      </div>
    </div>
  );
};

export default ActionsTable;
