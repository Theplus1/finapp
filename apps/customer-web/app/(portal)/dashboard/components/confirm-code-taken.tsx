import { formatUtcMMDDYYYYHHMM } from "@/app/utils/func";
import { Button } from "@repo/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from "@repo/ui/components/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { Eye } from "lucide-react";

type Props = {
  data: {
    name: string;
    gettedAt: string;
  }[];
};

const ConfirmCodeTaken = ({ data }: Props) => {
  return (
    <Popover>
      <PopoverTrigger>
        <Button variant={"link"}>{data.length}</Button>
      </PopoverTrigger>
      <PopoverContent className="grid gap-3">
        {data.length > 0 ? (
          data.map((item, index) => (
            <Item variant="outline" className="relative" key={index}>
              <ItemContent>
                <ItemTitle className="text-lg w-[100%] flex justify-between items-center">
                  {item.name} <Eye size={16} className="text-end" />
                </ItemTitle>
              </ItemContent>
              <ItemActions className="flex justify-between w-[100%]">
                <div>Get code at: </div>
                <div>{formatUtcMMDDYYYYHHMM(item.gettedAt)}</div>
              </ItemActions>
            </Item>
          ))
        ) : (
          <div>No confirm code histories taken</div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ConfirmCodeTaken;
