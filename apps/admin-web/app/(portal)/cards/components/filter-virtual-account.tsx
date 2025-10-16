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
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

type Props = {
  onVirtualAccountChange: (virtualAccountId: string) => void;
};

const FilterVirtualAccount = ({ onVirtualAccountChange }: Props) => {
  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos"],
      queryFn: async () => {
        const res = await api.virtualAccounts.getVirtualAccounts();
        return res;
      },
    });

  const handleValueChange = (value: string) => {
    onVirtualAccountChange(value === "all" ? "" : value);
  };

  const virtualAccountData = virtualAccountInfos?.data ?? [];

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
          {virtualAccountData.map((virtualAccount: VirtualAccount) => (
            <SelectItem
              key={virtualAccount.slashId}
              value={virtualAccount.slashId}
            >
              {virtualAccount.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export default FilterVirtualAccount;
