import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { useState } from "react";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Spinner } from "@repo/ui/components/spinner";
import { VirtualAccount } from "@/lib/api/endpoints/virtual-account";

type Props = {
  onVirtualAccountChange: (virtualAccount: string) => void;
};

const limitPerRequest = 100;

const FilterVirtualAccount = ({ onVirtualAccountChange }: Props) => {
  const [value, setValue] = useState<string | undefined>("");

  const { data: virtualAccounts, isLoading } = useQuery({
    queryKey: ["virtual-accounts"],
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
      if (totalVirtualAccounts.length > 0) {
        onVirtualAccountChange(totalVirtualAccounts[0].slashId);
        setValue(totalVirtualAccounts[0].slashId);
      }
      return totalVirtualAccounts;
    },
    refetchOnMount: "always",
    gcTime: 0,
  });

  const handleValueChange = (value: string) => {
    setValue(value);
    onVirtualAccountChange(value);
  };

  return (
    <FormItemWrapper label="Virtual Account">
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[200px]">
          {isLoading ? (
            <Spinner />
          ) : (
            <SelectValue placeholder="Select a virtual account" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a virtual account</SelectLabel>
            {(virtualAccounts?.length ?? 0) > 0 ? (
              virtualAccounts?.map((va) => (
                <SelectItem key={va._id} value={va.slashId}>
                  {va.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem disabled value="no-item">
                No virtual accounts found
              </SelectItem>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItemWrapper>
  );
};

export default FilterVirtualAccount;
