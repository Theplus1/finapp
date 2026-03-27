"use client";
import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
import { Input } from "@repo/ui/components/input";

type Props = {
  onSearch: (search: string) => void;
};

export function SearchTransaction({ onSearch }: Props) {
  return (
    <FormItemWrapper label="Search">
      <Input
        placeholder="Search transaction"
        onChange={(e) => onSearch(e.target.value)}
      />
    </FormItemWrapper>
  );
}
