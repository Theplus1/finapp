import FilterVirtualAccount from "../../cards/components/filter-virtual-account";
import FilterCard from "./filter-card";
import { FilterDate } from "./filter-date";

interface Props {
  onCardChange: (cardId: string) => void;
  onVirtualAccountChange: (virtualAccountId: string) => void;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
}

const FilterTransaction = ({
  onCardChange,
  onVirtualAccountChange,
  onDateFromChange,
  onDateToChange,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterCard onCardChange={onCardChange} />
      <FilterVirtualAccount onVirtualAccountChange={onVirtualAccountChange} />
      <FilterDate
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  );
};

export default FilterTransaction;
