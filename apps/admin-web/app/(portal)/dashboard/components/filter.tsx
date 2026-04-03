import FilterVirtualAccount from "../../cards/components/filter-virtual-account";
import { ExportTransactions } from "./export-transactions";
import FilterCard from "./filter-card";
import { FilterDate } from "./filter-date";
import FilterStatus from "./filter-status";

interface Props {
  onCardChange: (cardId: string) => void;
  onVirtualAccountChange: (virtualAccountId: string) => void;
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
  currentFilter?: Record<string, unknown>;
  onStatusChange: (status?: string) => void;
}

const FilterTransaction = ({
  onCardChange,
  onVirtualAccountChange,
  onDateFromChange,
  onDateToChange,
  currentFilter,
  onStatusChange,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4 items-end">
      <FilterCard onCardChange={onCardChange} />
      <FilterVirtualAccount onVirtualAccountChange={onVirtualAccountChange} />
      <FilterStatus onStatusChange={onStatusChange} />
      <FilterDate
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
      />
      <ExportTransactions currentFilter={currentFilter} />
    </div>
  );
};

export default FilterTransaction;
