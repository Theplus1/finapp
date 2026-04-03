import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
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
    <FormItemWrapper label="Search Card" className="mb-4">
      <Input
        className="w-[240px]"
        placeholder="Enter Card ID"
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    </FormItemWrapper>
  );
};

export default SearchCard;
