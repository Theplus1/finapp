import FilterCard from "./filter-card";
import FilterVirtualAccount from "./filter-virtual-account";

interface Props {
  onCardChange: (cardId: string) => void;
  onVirtualAccountChange: (virtualAccountId: string) => void;
}

const FilterTransaction = ({ onCardChange, onVirtualAccountChange }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterCard onCardChange={onCardChange} />
      <FilterVirtualAccount onVirtualAccountChange={onVirtualAccountChange} />
    </div>
  );
};

export default FilterTransaction;
