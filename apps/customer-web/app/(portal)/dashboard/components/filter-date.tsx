"use client";
import { DatePicker } from "@repo/ui/components/date-picker";
import FilterQuickTime, {
  QuickTimeEnum,
} from "@repo/ui/components/filter-quick-time";
import { useState } from "react";
import { getISOEndOfDay, getISOStartOfDay } from "@repo/ui/lib/func";

type Props = {
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
};

export function FilterDate({ onDateFromChange, onDateToChange }: Props) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [quickTimeValue, setQuickTimeValue] = useState<QuickTimeEnum>(
    QuickTimeEnum.Custom,
  );

  const handleChangeFrom = (date: Date | undefined) => {
    onDateFromChange(date ? getISOStartOfDay(date) : undefined);
    setQuickTimeValue(QuickTimeEnum.Custom);
  };

  const handleChangeTo = (date: Date | undefined) => {
    onDateToChange(date ? getISOEndOfDay(date) : undefined);
    setQuickTimeValue(QuickTimeEnum.Custom);
  };

  const handleQuickTimeChange = (
    value: QuickTimeEnum,
    start: Date,
    end: Date,
  ) => {
    setDateFrom(start);
    setDateTo(end);
    onDateFromChange(getISOStartOfDay(start));
    onDateToChange(getISOEndOfDay(end));
    setQuickTimeValue(value);
  };

  return (
    <>
      <FilterQuickTime
        defaultValue={quickTimeValue}
        onQuickTimeChange={handleQuickTimeChange}
      />
      <DatePicker
        onChange={handleChangeFrom}
        label="From"
        dateDefault={dateFrom}
      />
      <DatePicker onChange={handleChangeTo} label="To" dateDefault={dateTo} />
    </>
  );
}
