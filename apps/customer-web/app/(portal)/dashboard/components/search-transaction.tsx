"use client";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";

type Props = {
  onSearch: (search: string) => void;
};

export function SearchTransaction({ onSearch }: Props) {
  return (
    <div className="flex gap-3">
      <Label className="px-1">Search</Label>
      <Input
        placeholder="Search transaction"
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
  );
}
