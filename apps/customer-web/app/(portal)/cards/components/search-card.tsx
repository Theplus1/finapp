import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { Textarea } from "@repo/ui/components/textarea";

type Props = {
  onCardChange: (card: string) => void;
  value: string;
};

const SearchCard = ({ onCardChange, value }: Props) => {
  return (
    <FormItemWrapper label="Card ID (mỗi ID 1 dòng)">
      <Textarea
        className="w-[220px] min-h-[60px] text-sm"
        placeholder={"card_abc123\ncard_xyz456"}
        value={value}
        onChange={(e) => onCardChange(e.target.value)}
      />
    </FormItemWrapper>
  );
};

export default SearchCard;
