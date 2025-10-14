"use client";
import { DatePicker } from "@/components/ui/date-picker";

type Props = {
  onDateFromChange: (date: string | undefined) => void;
  onDateToChange: (date: string | undefined) => void;
};

const getTimeEndOfDay = (startDate: Date) => {
  return startDate.getTime() + 86400000 - 1;
};

export function FilterDate({ onDateFromChange, onDateToChange }: Props) {
  const handleChangeFrom = (date: Date | undefined) => {
    onDateFromChange(date ? date.getTime().toString() : undefined);
  };

  const handleChangeTo = (date: Date | undefined) => {
    onDateToChange(date ? getTimeEndOfDay(date).toString() : undefined);
  };

  return (
    <div className="flex gap-3">
      <DatePicker onChange={(date) => handleChangeFrom(date)} label="From" />
      <DatePicker onChange={(date) => handleChangeTo(date)} label="To" />
    </div>
  );
}
