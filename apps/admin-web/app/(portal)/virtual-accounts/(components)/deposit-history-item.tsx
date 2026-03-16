import { formatDollarByCent, formatUtcMMDDYYYY } from "@/app/utils/func";
import {
  ItemTitle,
  ItemDescription,
  ItemContent,
  Item,
  ItemActions,
} from "@repo/ui/components/item";

type Props = {
  label: string;
  value: number;
  createdAt: string;
};

const DepositHistoryItem = ({ label, value, createdAt }: Props) => {
  return (
    <Item variant="outline" className="relative">
      <ItemContent>
        <ItemTitle className="text-lg">{formatDollarByCent(value)}</ItemTitle>
        <ItemDescription>{formatUtcMMDDYYYY(label)}</ItemDescription>
      </ItemContent>
      <ItemActions className="absolute bottom-[10px] right-[10px]">
        <div>
          <p>Created at:</p>
          {formatUtcMMDDYYYY(createdAt)}
        </div>
      </ItemActions>
    </Item>
  );
};

export default DepositHistoryItem;
