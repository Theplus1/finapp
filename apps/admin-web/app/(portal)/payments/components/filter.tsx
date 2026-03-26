import FilterMonthYear from "./filter-month";

interface Props {
  onChangeMonth: (monthYear: string) => void;
}

const FilterTable = ({ onChangeMonth }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterMonthYear onMonthYearChange={onChangeMonth} />
    </div>
  );
};

export default FilterTable;
