import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

type Props = {
  onCardChange: (card: string) => void;
  value: string;
};

const SearchCard = ({ onCardChange, value }: Props) => {
  const handleValueChange = (value: string) => {
    onCardChange(value);
  };

  return (
    <div className="mb-4 w-full flex items-center gap-2">
      <Label>Search Card</Label>
      <Input
        className="w-[240px]"
        placeholder="Enter Card ID"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    </div>
  );
};

export default SearchCard;
