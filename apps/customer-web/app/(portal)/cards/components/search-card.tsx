import { Input } from "@repo/ui/components/input";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";

type Props = {
  onCardChange: (card: string) => void;
  value: string;
};

const SearchCard = ({ onCardChange, value }: Props) => {
  const handleValueChange = (value: string) => {
    onCardChange(value);
  };

  return (
    <FormItemWrapper label="Card">
      <Input
        className="w-auto"
        placeholder="Card name"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    </FormItemWrapper>
  );
};

export default SearchCard;
