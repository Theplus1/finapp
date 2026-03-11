import { Button } from "@repo/ui/components/button";
import { Lock, Settings, Trash2, Unlock } from "lucide-react";
import { Card, CardStatus, DrawerCardTypeEnum } from "@/lib/api/endpoints/card";

type Props = {
  onClickAction: (type: DrawerCardTypeEnum) => void;
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
            card.status !== CardStatus.PAUSED &&
            onClickAction(DrawerCardTypeEnum.LOCK)
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
            card.status !== CardStatus.ACTIVE &&
            onClickAction(DrawerCardTypeEnum.UNLOCK)
          }
        >
          <Unlock data-icon="inline-start" />
          Unlock card
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction(DrawerCardTypeEnum.SET_PRE_RECHARGE)}
        >
          <Settings data-icon="inline-start" />
          Set pre recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction(DrawerCardTypeEnum.UNSET_PRE_RECHARGE)}
        >
          <Trash2 data-icon="inline-start" />
          Unset pre recharge
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction(DrawerCardTypeEnum.SET_SPENDING_LIMIT)}
        >
          <Settings data-icon="inline-start" />
          Set spending limit
        </Button>
        <Button
          variant={"outline"}
          size={"default"}
          className="cursor-pointer"
          onClick={() => onClickAction(DrawerCardTypeEnum.UNSET_SPENDING_LIMIT)}
        >
          <Trash2 data-icon="inline-start" />
          Unset spending limit
        </Button>
      </div>
    </div>
  );
};

export default ActionsTable;
