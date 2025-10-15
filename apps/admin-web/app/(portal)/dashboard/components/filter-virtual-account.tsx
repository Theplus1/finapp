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
  onVirtualAccountChange: (virtualAccountId: string) => void;
};

const FilterVirtualAccount = ({ onVirtualAccountChange }: Props) => {
  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos"],
      queryFn: async () => {
        const res = await api.virtualAccounts.getVirtualAccounts();
        return res.data;
      },
    });

  const handleValueChange = (value: string) => {
    onVirtualAccountChange(value === "all" ? "" : value);
  };

  return (
    <Select onValueChange={handleValueChange}>
      <SelectTrigger className="w-[280px]">
        {isLoadingVirtualAccountInfos ? (
          <Spinner />
        ) : (
          <SelectValue placeholder="Select a virtual account" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Select a virtual account</SelectLabel>
          <SelectItem key="all" value="all">
            All
          </SelectItem>
          {virtualAccountInfos?.data.map((virtualAccount) => (
            <SelectItem key={virtualAccount._id} value={virtualAccount.slashId}>
              {virtualAccount.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default FilterVirtualAccount;
