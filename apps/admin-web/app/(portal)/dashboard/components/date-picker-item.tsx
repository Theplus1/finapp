import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

type Props = {
  label: string;
  onChange: (date: Date | undefined) => void;
};
const DatePickerItem = ({ label, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const handleChange = (date: Date | undefined) => {
    setDate(date);
    setOpen(false);
    onChange(date);
  };
  return (
    <>
      <Label htmlFor="date" className="px-1">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date"
            className="w-48 justify-between font-normal"
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            key={"dateTo"}
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              handleChange(date);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleChange(undefined);
            }}
            className="mt-2"
          >
            Clear
          </Button>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default DatePickerItem;
