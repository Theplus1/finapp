// import { ExportCardSpend } from "./export-cards";
import FilterCard from "./filter-card";
import FilterMonthYear from "@repo/ui/components/filter-month-year";

interface Props {
  keywordCard: string;
  onFilterMonthChange: (month: string) => void;
  onFilterCardChange: (card: string) => void;
  // currentFilter?: Record<string, unknown>;
}

const FilterCardSpend = ({
  keywordCard,
  onFilterMonthChange,
  onFilterCardChange,
  // currentFilter,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4 items-end">
      <FilterMonthYear onMonthYearChange={onFilterMonthChange} />
      <FilterCard onCardChange={onFilterCardChange} value={keywordCard} />
      {/* <ExportCardSpend currentFilter={currentFilter} /> */}
    </div>
  );
};

export default FilterCardSpend;
