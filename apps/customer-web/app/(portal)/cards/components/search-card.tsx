import { Label } from "@repo/ui/components/label";
import { Input } from "@repo/ui/components/input";

type Props = {
  onCardChange: (card: string) => void;
  value: string;
};

const SearchCard = ({ onCardChange, value }: Props) => {
  const handleValueChange = (value: string) => {
    onCardChange(value);
  };

  return (
    <>
      <Label className="px-1">Card</Label>
      <Input
        className="w-auto"
        placeholder="Card name"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    </>
  );
};

export default SearchCard;
