import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSelect24hProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Generate hours 00-23
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Generate minutes in 5-minute intervals (00, 05, 10, ..., 55)
const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export const TimeSelect24h = ({ value, onChange, className }: TimeSelect24hProps) => {
  const [selectedHour, selectedMinute] = value.split(':');

  const handleHourChange = (hour: string) => {
    onChange(`${hour}:${selectedMinute || '00'}`);
  };

  const handleMinuteChange = (minute: string) => {
    onChange(`${selectedHour || '12'}:${minute}`);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      
      <Select value={selectedHour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-lg font-medium">:</span>

      <Select value={selectedMinute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((minute) => (
            <SelectItem key={minute} value={minute}>
              {minute}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
