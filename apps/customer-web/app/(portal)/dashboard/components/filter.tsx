import FilterCard from "./filter-card";
import { FilterDate } from "./filter-date";
import { SearchTransaction } from "./search-transaction";

interface Props {
  onCardChange: (cardId: string) => void;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  onSearch: (search: string) => void;
}

const FilterTransaction = ({
  onCardChange,
  onDateFromChange,
  onDateToChange,
  onSearch,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <SearchTransaction onSearch={onSearch} />
      <FilterCard onCardChange={onCardChange} />
      <FilterDate
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
    </div>
  );
};

export default FilterTransaction;
