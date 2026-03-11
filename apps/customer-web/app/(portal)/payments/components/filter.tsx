import FilterMonthYear from "./filter-month";

interface Props {
  onFilterChange: (month: string) => void;
}

const FilterTime = ({ onFilterChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterMonthYear onMonthYearChange={onFilterChange} />
    </div>
  );
};

export default FilterTime;
