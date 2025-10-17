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

type Props = {
  onGroupChange: (groupId: string) => void;
};

const FilterGroup = ({ onGroupChange }: Props) => {
  const { data: groupInfos = [], isLoading: isLoadingGroupInfos } = useQuery({
    queryKey: ["group-infos"],
    queryFn: async () => {
      const res = await api.cardGroups.getCardGroup();
      return res.data ?? [];
    },
  });

  const handleValueChange = (value: string) => {
    onGroupChange(value === "all" ? "" : value);
  };

  return (
    <Select onValueChange={handleValueChange}>
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
  );
};

export default FilterGroup;
