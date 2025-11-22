import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduleBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: string) => void;
  batchNumber: number;
}

export const ScheduleBatchDialog = ({ open, onOpenChange, onSchedule, batchNumber }: ScheduleBatchDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('12:00');

  const handleSchedule = () => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onSchedule(scheduledDateTime.toISOString());
    onOpenChange(false);
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Agendar Bloco #{batchNumber}
          </DialogTitle>
          <DialogDescription>
            Escolha a data e horário para envio automático deste bloco
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Data do Envio</Label>
            <div className="flex justify-center border rounded-md p-3 bg-card">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < minDate}
                locale={ptBR}
                className="rounded-md"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário do Envio
            </Label>
            <Input
              id="time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full"
            />
          </div>

          {selectedDate && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
              <p className="text-sm font-medium">
                Envio programado para:
              </p>
              <p className="text-lg font-semibold text-primary">
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={!selectedDate}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Agendar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
