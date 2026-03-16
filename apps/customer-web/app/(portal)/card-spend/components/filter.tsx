import FilterCard from "./filter-card";
import FilterMonthYear from "./filter-month";

interface Props {
  keywordCard: string;
  onFilterMonthChange: (month: string) => void;
  onFilterCardChange: (card: string) => void;
}

const FilterCardSpend = ({ keywordCard, onFilterMonthChange, onFilterCardChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterMonthYear onMonthYearChange={onFilterMonthChange} />
      <FilterCard onCardChange={onFilterCardChange} value={keywordCard} />
    </div>
  );
};

export default FilterCardSpend;
