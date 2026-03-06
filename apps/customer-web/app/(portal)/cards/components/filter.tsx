import FilterGroup from "./filter-group";
import FilterStatus from "./filter-status";

interface Props {
  onGroupChange: (groupId: string) => void;
  onStatusChange: (status: string) => void;
}

const FilterCard = ({ onGroupChange, onStatusChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterGroup onGroupChange={onGroupChange} />
      <FilterStatus onStatusChange={onStatusChange} />
    </div>
  );
};

export default FilterCard;
