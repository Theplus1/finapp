import FilterCard from "./filter-card";
import { FilterDate } from "./filter-date";
import FilterStatus from "./filter-status";
import { SearchTransaction } from "./search-transaction";

interface Props {
  onCardChange: (cardId: string) => void;
  onStatusChange: (status?: string) => void;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  onSearch: (search: string) => void;
}

const FilterTransaction = ({
  onCardChange,
  onDateFromChange,
  onDateToChange,
  onSearch,
  onStatusChange,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <SearchTransaction onSearch={onSearch} />
      <FilterCard onCardChange={onCardChange} />
      <FilterStatus onStatusChange={onStatusChange} />
      <FilterDate
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  );
};

export default FilterTransaction;
