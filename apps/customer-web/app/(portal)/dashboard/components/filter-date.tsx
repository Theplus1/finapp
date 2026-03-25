"use client";
import { DatePicker } from "@repo/ui/components/date-picker";
import FilterQuickTime, {
  QuickTimeEnum,
} from "@repo/ui/components/filter-quick-time";
import { useState } from "react";

type Props = {
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
};
const getISOStartOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`;
};

const getISOEndOfDay = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T23:59:59.999Z`;
};

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

export function FilterDate({ onDateFromChange, onDateToChange }: Props) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [quickTimeValue, setQuickTimeValue] = useState<QuickTimeEnum>(
    QuickTimeEnum.Custom,
  );

  const handleChangeFrom = (date: Date | undefined) => {
    setDateFrom(date);
    onDateFromChange(date ? getISOStartOfDay(date) : undefined);
    setQuickTimeValue(QuickTimeEnum.Custom);
  };

  const handleChangeTo = (date: Date | undefined) => {
    setDateTo(date);
    onDateToChange(date ? getISOEndOfDay(date) : undefined);
    setQuickTimeValue(QuickTimeEnum.Custom);
  };

  const handleQuickTimeChange = (quickTime: QuickTimeEnum) => {
    const date = dateByQuickTime[quickTime as keyof typeof dateByQuickTime];
    if (date) {
      setDateFrom(date.start);
      setDateTo(date.end);
      onDateFromChange(getISOStartOfDay(date.start));
      onDateToChange(getISOEndOfDay(date.end));
      setQuickTimeValue(quickTime);
    }
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
