"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { useEffect, useState } from "react";
import { FormItemWrapper } from "./form-item-wrapper";

type Props = {
  label?: string | React.ReactNode;
  onChange: (date?: Date) => void;
  showClear?: boolean;
  triggerClassName?: string;
  dateDefault?: Date;
};

export function DatePicker({
  label,
  onChange,
  showClear = true,
  triggerClassName,
  dateDefault,
}: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const handleChange = (date: Date | undefined) => {
    setDate(date);
    setOpen(false);
    onChange(date);
  };

  useEffect(() => {
    if (dateDefault) {
      setDate(dateDefault);
    }
  }, [dateDefault]);

  return (
    <FormItemWrapper label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!date}
            className={`data-[empty=true]:text-muted-foreground w-48 justify-between font-normal ${triggerClassName}`}
          >
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => {
              handleChange(date);
            }}
          />
          <>
            {showClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChange(undefined)}
              >
                Clear
              </Button>
            )}
          </>
        </PopoverContent>
      </Popover>
    </FormItemWrapper>
  );
}
