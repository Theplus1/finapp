import { Button } from "@repo/ui/components/button";
import { History, Plus, Settings } from "lucide-react";
import { DrawerType } from "../page";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

type Props = {
  onClickAction: (type: DrawerType) => void;
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
              : onClickAction("set-account")
          }
        >
          <Settings data-icon="inline-start" />
          Set account
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction("recharge")}
        >
          <Plus data-icon="inline-start" />
          Recharge
        </Button>
        <Button variant={"outline"} size={"default"} className="cursor-pointer">
          <History data-icon="inline-start" />
          Charge histories
        </Button>
      </div>
    </div>
  );
};

export default ActionsTable;
