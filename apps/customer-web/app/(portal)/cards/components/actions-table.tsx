import { Button } from "@repo/ui/components/button";
import { Lock, Settings, Trash2, Unlock } from "lucide-react";
import { Card, CardStatus } from "@/lib/api/endpoints/card";
export type DrawerCardType =
  | "lock"
  | "unlock"
  | "set-pre-recharge"
  | "unset-pre-recharge"
  | "set-spending-limit"
  | "unset-spending-limit";

type Props = {
  onClickAction: (type: DrawerCardType) => void;
  card: Card;
};

const ActionsTable = ({ onClickAction, card }: Props) => {
  return (
    <div>
      <div className="grid gap-2">
        <Button
          variant={"outline"}
          size={"default"}
          className={
            card.status === CardStatus.PAUSED
              ? "cursor-not-allowed"
              : "cursor-pointer"
          }
          onClick={() =>
            card.status !== CardStatus.PAUSED && onClickAction("lock")
          }
        >
          <Lock data-icon="inline-start" />
          Lock card
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className={
            card.status === CardStatus.ACTIVE
              ? "cursor-not-allowed"
              : "cursor-pointer"
          }
          onClick={() =>
            card.status !== CardStatus.ACTIVE && onClickAction("unlock")
          }
        >
          <Unlock data-icon="inline-start" />
          Unlock card
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction("set-pre-recharge")}
        >
          <Settings data-icon="inline-start" />
          Set pre recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction("unset-pre-recharge")}
        >
          <Trash2 data-icon="inline-start" />
          Unset pre recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction("set-spending-limit")}
        >
          <Settings data-icon="inline-start" />
          Set spending limit
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction("unset-spending-limit")}
        >
          <Trash2 data-icon="inline-start" />
          Unset spending limit
        </Button>
      </div>
    </div>
  );
};

export default ActionsTable;
