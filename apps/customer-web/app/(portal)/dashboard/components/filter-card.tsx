import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Spinner } from "@repo/ui/components/spinner";
import { Input } from "@repo/ui/components/input";
import { useMemo, useState } from "react";
import { Label } from "@repo/ui/components/label";

type Props = {
  onCardChange: (cardId: string) => void;
};

const FilterCard = ({ onCardChange }: Props) => {
  const [value, setValue] = useState("all");
  const [textSearch, setTextSearch] = useState("");

  const { data: cardInfos, isLoading: isLoadingCardInfos } = useQuery({
    queryKey: ["card-infos"],
    queryFn: async () => {
      const res = await api.cards.getCardsLookup();
      const { data } = res;
      return data;
    },
  });

  const handleValueChange = (value: string) => {
    setValue(value);
    onCardChange(value === "all" ? "" : value);
  };

  const cardInfosSelect = useMemo(() => {
    return cardInfos?.filter((card) => {
      return card.name.toLowerCase().includes(textSearch.trim().toLowerCase());
    });
  }, [cardInfos, textSearch]);

  return (
    <>
      <Label className="px-1">Card</Label>
      <Select onValueChange={handleValueChange} value={value}>
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
            {cardInfosSelect?.map((card) => (
              <SelectItem key={card._id} value={card.slashId}>
                {card.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
};

export default FilterCard;
