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
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";
import { Label } from "@repo/ui/components/label";
import { useState } from "react";

type Props = {
  onVirtualAccountChange: (virtualAccountId: string) => void;
};
const limitPerRequest = 20;

const FilterVirtualAccount = ({ onVirtualAccountChange }: Props) => {
  const [value, setValue] = useState("all");
  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos"],
      queryFn: async () => {
        let totalVirtualAccounts: VirtualAccount[] = [];
        let hasNext = true;
        let page = 1;
        while (hasNext) {
          const res = await api.virtualAccounts.getVirtualAccounts({
            page,
            limit: limitPerRequest,
          });
          const { pagination: paginationRes, data } = res;
          totalVirtualAccounts = [...totalVirtualAccounts, ...data];
          hasNext =
            (paginationRes?.total || 0) >=
            (paginationRes?.page || 1) * (paginationRes?.limit || 1);
          page++;
        }
        return totalVirtualAccounts;
      },
    });

  const handleValueChange = (value: string) => {
    setValue(value);
    onVirtualAccountChange(value === "all" ? "" : value);
  };

  const virtualAccountData = virtualAccountInfos ?? [];

  return (
    <>
      <Label className="px-1">Virtual account</Label>
      <Select onValueChange={handleValueChange} value={value}>
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
    </>
  );
};

export default FilterVirtualAccount;
