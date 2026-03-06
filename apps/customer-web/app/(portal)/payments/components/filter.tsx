import FilterMonth from "./filter-month";

interface Props {
  onMonthChange: (month: string) => void;
}

const FilterCard = ({ onMonthChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterMonth onMonthChange={onMonthChange} />
    </div>
  );
};

export default FilterCard;
