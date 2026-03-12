import { formatCurrency } from "@/app/utils/func";
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
  icon: React.ReactNode;
};

const StatisticItem = ({ label, value, icon }: Props) => {
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemDescription>{label}</ItemDescription>
        <ItemTitle>{formatCurrency(value)}</ItemTitle>
      </ItemContent>
      <ItemActions>{icon}</ItemActions>
    </Item>
  );
};

export default StatisticItem;
