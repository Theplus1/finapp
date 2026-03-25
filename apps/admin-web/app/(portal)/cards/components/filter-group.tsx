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
import { useState } from "react";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";

type Props = {
  onGroupChange: (groupId: string) => void;
};

const FilterGroup = ({ onGroupChange }: Props) => {
  const [value, setValue] = useState("all");
  const { data: groupInfos = [], isLoading: isLoadingGroupInfos } = useQuery({
    queryKey: ["group-infos"],
    queryFn: async () => {
      const res = await api.cardGroups.getCardGroup();
      return res.data ?? [];
    },
  });

  const handleValueChange = (value: string) => {
    setValue(value);
    onGroupChange(value === "all" ? "" : value);
  };

  return (
    <FormItemWrapper label="Group card">
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[280px]">
          {isLoadingGroupInfos ? (
            <Spinner />
          ) : (
            <SelectValue placeholder="Select a group card" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a group card</SelectLabel>
            <SelectItem key="all" value="all">
              All
            </SelectItem>
            {groupInfos.map((group) => (
              <SelectItem key={group._id} value={group.slashId}>
                {group.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItemWrapper>
  );
};

export default FilterGroup;
