import { Label } from "@repo/ui/components/label";
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

type Props = {
  onStatusChange: (status?: string) => void;
};

type Status = "Pending" | "Settled" | "Reversed" | "Refund";

const arrStatus: Record<Status, string> = {
  Pending: "pending",
  Settled: "settled",
  Reversed: "reversed",
  Refund: "refund",
};

const FilterStatus = ({ onStatusChange }: Props) => {
  const [value, setValue] = useState("all");
  const handleValueChange = (value: string) => {
    setValue(value);
    onStatusChange(value === "all" ? undefined : value);
  };

  return (
    <>
      <Label className="px-1">Status</Label>
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a status" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a status</SelectLabel>
            <SelectItem key="all" value="all">
              All
            </SelectItem>
            {Object.keys(arrStatus).map((field) => (
              <SelectItem key={field} value={arrStatus[field as Status]}>
                {field}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
};

export default FilterStatus;
