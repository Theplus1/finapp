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

type Props = {
  onMonthYearChange: (month: string) => void;
};

const FilterMonthYear = ({ onMonthYearChange }: Props) => {
  // render months from 2025-01 to current month
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [value, setValue] = useState<string | undefined>(
    `${currentYear}-${currentMonth.toString().padStart(2, "0")}`,
  );
  const months: string[] = [];
  for (let year = 2025; year <= currentYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === currentYear && month > currentMonth) {
        break;
      }
      months.unshift(`${year}-${month.toString().padStart(2, "0")}`);
    }
  }

  const handleValueChange = (value: string) => {
    setValue(value);
    onMonthYearChange(value);
  };

  return (
    <FormItemWrapper label="Month">
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a month</SelectLabel>
            {months.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItemWrapper>
  );
};

export default FilterMonthYear;
