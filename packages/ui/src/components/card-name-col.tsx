import { EMPTY_LABEL } from "../lib/constant";

export interface CardShort {
  slashId: string;
  name: string;
  last4: string;
}

type Props = {
  card?: CardShort;
  cardId?: string;
};

const CardNameCol = ({ card, cardId = "" }: Props) => {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[100px]">{card?.name || cardId || EMPTY_LABEL}</div>
      {card?.last4 && (
        <div className="text-xs bg-gray-600 text-white rounded px-2 py-1">
          {card.last4}
        </div>
      )}
    </div>
  );
};

export default CardNameCol;
