"use client";

import { ChevronDownIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

type Props = {
  label?: string;
  onChange: (date?: Date) => void;
  showClear?: boolean;
};

export function DatePicker({ label, onChange, showClear = true }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const handleChange = (date: Date | undefined) => {
    setDate(date);
    setOpen(false);
    onChange(date);
  };

  return (
    <>
      {label && (
        <Label htmlFor="date" className="px-1">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-empty={!date}
            className="data-[empty=true]:text-muted-foreground w-48 justify-between font-normal"
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
    </>
  );
}
