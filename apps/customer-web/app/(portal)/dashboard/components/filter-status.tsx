import { FormItemWrapper } from "@repo/ui/components/form-item-wrapper";
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

type Status = "Pending" | "Settled" | "Reversed" | "Refund" | "Declined";

const arrStatus: Record<Status, string> = {
  Pending: "pending",
  Settled: "settled",
  Reversed: "reversed",
  Refund: "refund",
  Declined: "declined",
};

const FilterStatus = ({ onStatusChange }: Props) => {
  const [value, setValue] = useState("all");
  const handleValueChange = (value: string) => {
    setValue(value);
    onStatusChange(value === "all" ? undefined : value);
  };

  return (
    <FormItemWrapper label="Status">
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[240px]">
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
    </FormItemWrapper>
  );
};

export default FilterStatus;
