import { ExportCards } from "./export-cards";
import FilterStatus from "./filter-status";
import SearchCard from "./search-card";

interface Props {
  onStatusChange: (status: string) => void;
  onCardChange: (card: string) => void;
  keywordCard: string;
  currentFilter: Record<string, string>;
}

const FilterCard = ({
  onStatusChange,
  onCardChange,
  keywordCard,
  currentFilter,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4 items-end">
      <FilterStatus onStatusChange={onStatusChange} />
      <SearchCard onCardChange={onCardChange} value={keywordCard} />
      <ExportCards currentFilter={currentFilter} />
    </div>
  );
};

export default FilterCard;
