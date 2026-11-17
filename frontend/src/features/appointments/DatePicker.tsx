import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { ptBR } from 'react-day-picker/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  calendarDateToPickerDate,
  formatCalendarDate,
  pickerDateToCalendarDate,
  todayInClinic,
} from '@/lib/clinic-time';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  /** Accessible name when there is no visible label (e.g. a filter). */
  'aria-label'?: string;
  /** Calendar date, `YYYY-MM-DD`. */
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  isDateDisabled?: (calendarDate: string) => boolean;
  className?: string;
}

export function DatePicker({
  id,
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder = 'Selecione uma data',
  isDateDisabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value === undefined ? undefined : calendarDateToPickerDate(value);
  // "Today" is the clinic's day, not the browser's, so the highlight matches the blocked days.
  const today = calendarDateToPickerDate(todayInClinic());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            aria-label={
              ariaLabel === undefined
                ? undefined
                : `${ariaLabel}: ${value === undefined ? placeholder : formatCalendarDate(value)}`
            }
            variant="outline"
            className={cn(
              'justify-start font-normal',
              value === undefined && 'text-muted-foreground',
              className,
            )}
          />
        }
      >
        <CalendarIcon />
        {value === undefined ? placeholder : formatCalendarDate(value)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          today={today}
          selected={selected}
          defaultMonth={selected ?? today}
          onSelect={(date) => {
            onChange(date === undefined ? undefined : pickerDateToCalendarDate(date));
            setOpen(false);
          }}
          {...(isDateDisabled === undefined
            ? {}
            : { disabled: (date: Date) => isDateDisabled(pickerDateToCalendarDate(date)) })}
        />
      </PopoverContent>
    </Popover>
  );
}
