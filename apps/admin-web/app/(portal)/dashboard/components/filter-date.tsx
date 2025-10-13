"use client";
import DatePickerItem from "./date-picker-item";

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
      <DatePickerItem
        label="From"
        onChange={(date) => handleChangeFrom(date)}
      />
      <DatePickerItem label="To" onChange={(date) => handleChangeTo(date)} />
    </div>
  );
}
