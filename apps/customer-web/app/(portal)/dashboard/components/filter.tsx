import { ExportTransactions } from "./export-transactions";
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
  currentFilter?: Record<string, unknown>;
  showExportTransaction?: boolean;
}

const ActionTableTransaction = ({
  onCardChange,
  onDateFromChange,
  onDateToChange,
  onSearch,
  onStatusChange,
  currentFilter,
  showExportTransaction = false,
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
      {showExportTransaction && (
        <ExportTransactions currentFilter={currentFilter} />
      )}
    </div>
  );
};

export default ActionTableTransaction;
