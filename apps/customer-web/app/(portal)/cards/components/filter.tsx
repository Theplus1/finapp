import FilterStatus from "./filter-status";

interface Props {
  onStatusChange: (status: string) => void;
}

const FilterCard = ({ onStatusChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterStatus onStatusChange={onStatusChange} />
    </div>
  );
};

export default FilterCard;
