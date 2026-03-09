import { CardShort } from "@/lib/api/endpoints/transaction";

const CardNameCol = ({ card }: { card: CardShort }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-[190px]">{card.name}</div>
      <div className="text-xs bg-gray-600 text-white rounded px-2 py-1">
        {card.last4}
      </div>
    </div>
  );
};

export default CardNameCol;
