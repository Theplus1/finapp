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
  onQuickTimeChange: (quickTime: QuickTimeEnum, start: Date, end: Date) => void;
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

const dateByQuickTime = {
  [QuickTimeEnum.Today]: {
    start: new Date(),
    end: new Date(),
  },
  [QuickTimeEnum.Yesterday]: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  [QuickTimeEnum["Last 7 Days"]]: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  [QuickTimeEnum["Last 30 Days"]]: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  },
  [QuickTimeEnum["This Month"]]: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  },
  [QuickTimeEnum["Last Month"]]: {
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
  },
};

const FilterQuickTime = ({ defaultValue, onQuickTimeChange }: Props) => {
  const [value, setValue] = useState<QuickTimeEnum>(QuickTimeEnum.Custom);
  const handleValueChange = (value: QuickTimeEnum) => {
    setValue(value);
    const date = dateByQuickTime[value as keyof typeof dateByQuickTime];
    if (date) {
      onQuickTimeChange(value, date.start, date.end);
    }
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
