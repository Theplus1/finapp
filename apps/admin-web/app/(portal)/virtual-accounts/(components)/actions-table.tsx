import { Button } from "@repo/ui/components/button";
import { History, Plus, Settings } from "lucide-react";
import {
  DrawerTypeVirtualAccountEnum,
  VirtualAccount,
} from "@/lib/api/endpoints/virtual-account";

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
          className={
            !!virtualAccount.bossUsername
              ? "cursor-not-allowed"
              : "cursor-pointer"
          }
          onClick={() =>
            !!virtualAccount.bossUsername
              ? undefined
              : onClickAction(DrawerTypeVirtualAccountEnum.SET_ACCOUNT)
          }
        >
          <Settings data-icon="inline-start" />
          Connect boss account
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction(DrawerTypeVirtualAccountEnum.RECHARGE)}
        >
          <Plus data-icon="inline-start" />
          Recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
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
