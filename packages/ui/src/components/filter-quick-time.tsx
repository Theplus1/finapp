import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { useEffect, useState } from "react";
import { FormItemWrapper } from "./form-item-wrapper";

type Props = {
  defaultValue: QuickTimeEnum;
  onQuickTimeChange: (quickTime: QuickTimeEnum) => void;
};

export enum QuickTimeEnum {
  Today = "today",
  Yesterday = "yesterday",
  "Last 7 Days" = "last-7-days",
  "Last 30 Days" = "last-30-days",
  "This Month" = "this-month",
  "Last Month" = "last-month",
  Custom = "custom",
}

const FilterQuickTime = ({ defaultValue, onQuickTimeChange }: Props) => {
  const [value, setValue] = useState<QuickTimeEnum>(QuickTimeEnum.Custom);
  const handleValueChange = (value: string) => {
    setValue(value as QuickTimeEnum);
    onQuickTimeChange(value as QuickTimeEnum);
  };

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue);
    }
  }, [defaultValue]);

  return (
    <FormItemWrapper label="Quick Time">
      <Select onValueChange={handleValueChange} value={value}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select a quick time" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select a quick time</SelectLabel>
            {Object.keys(QuickTimeEnum).map((field) => (
              <SelectItem
                key={field}
                value={QuickTimeEnum[field as keyof typeof QuickTimeEnum]}
                disabled={
                  QuickTimeEnum[field as keyof typeof QuickTimeEnum] ===
                  QuickTimeEnum.Custom
                }
              >
                {field}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FormItemWrapper>
  );
};

export default FilterQuickTime;
