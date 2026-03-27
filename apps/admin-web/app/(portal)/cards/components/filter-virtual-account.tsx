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
import { useEffect, useMemo, useState } from "react";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { Input } from "@repo/ui/components/input";
import { usePathname } from "next/navigation";

type Props = {
  onVirtualAccountChange: (virtualAccountId: string) => void;
  showAll?: boolean;
};
const limitPerRequest = 100;

const FilterVirtualAccount = ({
  onVirtualAccountChange,
  showAll = true,
}: Props) => {
  const [value, setValue] = useState("all");
  const [textSearch, setTextSearch] = useState("");
  const pathName = usePathname();

  const { data: virtualAccountInfos, isLoading: isLoadingVirtualAccountInfos } =
    useQuery({
      queryKey: ["virtual-account-infos", showAll],
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

  const virtualAccountDataFiltered = useMemo(() => {
    if (!virtualAccountInfos) return [];
    return virtualAccountInfos.filter((virtualAccount) => {
      return virtualAccount.name
        .toLowerCase()
        .includes(textSearch.trim().toLowerCase());
    });
  }, [virtualAccountInfos, textSearch]);

  useEffect(() => {
    handleValueChange(
      showAll ? "all" : virtualAccountInfos?.[0]?.slashId || "",
    );
  }, [pathName, virtualAccountInfos, showAll]);

  return (
    <FormItemWrapper label="Virtual account">
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
            <Input
              key={"filterVirtualAccount"}
              value={textSearch}
              placeholder="Search virtual account"
              className="w-full sticky top-0 z-10 bg-background"
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              onChange={(e) => {
                setTextSearch(e.target.value);
              }}
            />
            {showAll && (
              <SelectItem key="all" value="all">
                All
              </SelectItem>
            )}
            {virtualAccountDataFiltered.map(
              (virtualAccount: VirtualAccount) => (
                <SelectItem
                  key={virtualAccount.slashId}
                  value={virtualAccount.slashId}
                >
                  {virtualAccount.name}
                </SelectItem>
              ),
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItemWrapper>
  );
};

export default FilterVirtualAccount;
