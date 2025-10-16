"use client";
import { DatePicker } from "@/components/ui/date-picker";

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

export function FilterDate({ onDateFromChange, onDateToChange }: Props) {
  const handleChangeFrom = (date: Date | undefined) => {
    onDateFromChange(date ? getISOStartOfDay(date) : undefined);
  };

  const handleChangeTo = (date: Date | undefined) => {
    onDateToChange(date ? getISOEndOfDay(date) : undefined);
  };

  return (
    <div className="flex gap-3">
      <DatePicker onChange={(date) => handleChangeFrom(date)} label="From" />
      <DatePicker onChange={(date) => handleChangeTo(date)} label="To" />
    </div>
  );
}
