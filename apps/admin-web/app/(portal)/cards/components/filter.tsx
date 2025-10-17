import FilterGroup from "./filter-group";
import FilterStatus from "./filter-status";
import FilterVirtualAccount from "./filter-virtual-account";

interface Props {
  onGroupChange: (groupId: string) => void;
  onVirtualAccountChange: (virtualAccountId: string) => void;
  onStatusChange: (status: string) => void;
}

const FilterCard = ({
  onGroupChange,
  onVirtualAccountChange,
  onStatusChange,
}: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterGroup onGroupChange={onGroupChange} />
      <FilterVirtualAccount onVirtualAccountChange={onVirtualAccountChange} />
      <FilterStatus onStatusChange={onStatusChange} />
    </div>
  );
};

export default FilterCard;
