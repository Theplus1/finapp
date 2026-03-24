import SearchCard from "./search-card";

interface Props {
  onCardChange: (card: string) => void;
  keywordCard: string;
}

const FilterCard = ({ onCardChange, keywordCard }: Props) => {
  return <SearchCard onCardChange={onCardChange} value={keywordCard} />;
};

export default FilterCard;
