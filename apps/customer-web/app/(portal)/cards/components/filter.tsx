import FilterStatus from "./filter-status";
import SearchCard from "./search-card";

interface Props {
  onStatusChange: (status: string) => void;
  onCardChange: (card: string) => void;
  keywordCard: string;
}

const FilterCard = ({ onStatusChange, onCardChange, keywordCard }: Props) => {
  return (
    <div className="pb-4 flex gap-4">
      <FilterStatus onStatusChange={onStatusChange} />
      <SearchCard onCardChange={onCardChange} value={keywordCard} />
    </div>
  );
};

export default FilterCard;
