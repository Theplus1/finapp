import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Card } from "@/lib/api/endpoints/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

type Props = {
  onCardChange: (cardId: string) => void;
};
const limitPerRequest = 100;

const FilterCard = ({ onCardChange }: Props) => {
  const [textSearch, setTextSearch] = useState("");

  const { data: cardInfos, isLoading: isLoadingCardInfos } = useQuery({
    queryKey: ["card-infos"],
    queryFn: async () => {
      let totalCardInfors: Card[] = [];
      let hasNext = true;
      let page = 1;
      while (hasNext) {
        const res = await api.cards.getCards({
          page,
          limit: limitPerRequest,
        });
        const { pagination: paginationRes, data } = res.data;
        totalCardInfors = [...totalCardInfors, ...data];
        if (!paginationRes.hasNext) {
          hasNext = false;
        }
        page++;
      }
      return totalCardInfors;
    },
  });

  const handleValueChange = (value: string) => {
    onCardChange(value === "all" ? "" : value);
  };

  const cardInforsSelect = useMemo(() => {
    return cardInfos?.filter((card) => {
      return card.name.toLowerCase().includes(textSearch.trim().toLowerCase());
    });
  }, [cardInfos, textSearch]);

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger className="w-[280px]">
        {isLoadingCardInfos ? (
          <Spinner />
        ) : (
          <SelectValue placeholder="Select a card" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Select a card</SelectLabel>
          <Input
            value={textSearch}
            placeholder="Search card"
            className="w-full sticky top-0 z-10 bg-background"
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            onChange={(e) => {
              setTextSearch(e.target.value);
            }}
          />
          <SelectItem key="all" value="all">
            All
          </SelectItem>
          {cardInforsSelect?.map((card) => (
            <SelectItem key={card._id} value={card.slashId}>
              {card.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default FilterCard;
