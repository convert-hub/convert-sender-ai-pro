import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBatches } from '@/hooks/useBatches';
import { useUserSettings } from '@/hooks/useUserSettings';

interface ScheduleBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (scheduledAt: string) => void;
  batchNumber: number;
  batchContactsCount: number;
}

export const ScheduleBatchDialog = ({ open, onOpenChange, onSchedule, batchNumber, batchContactsCount }: ScheduleBatchDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('12:00');
  const [limitWarning, setLimitWarning] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const { batches } = useBatches();
  const { settings } = useUserSettings();

  const handleSchedule = () => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(':');
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    onSchedule(scheduledDateTime.toISOString());
    onOpenChange(false);
  };

  // Check projected dispatches when date changes
  useEffect(() => {
    if (!selectedDate || !settings) return;

    const dailyLimit = (settings.stats as any)?.daily_dispatch_limit || 50;
    
    // Count contacts already scheduled for the selected date
    const scheduledForDate = batches
      .filter(batch => {
        if (!batch.scheduled_at || batch.status !== 'scheduled') return false;
        const batchDate = new Date(batch.scheduled_at);
        return isSameDay(batchDate, selectedDate);
      })
      .reduce((total, batch) => total + batch.contacts.length, 0);

    // Add current batch contacts
    const projectedTotal = scheduledForDate + batchContactsCount;

    if (projectedTotal > dailyLimit) {
      setLimitWarning({
        show: true,
        message: `Atenção: Você já possui ${scheduledForDate} envios agendados para este dia. Com este lote (${batchContactsCount} contatos), o total seria ${projectedTotal} envios, excedendo o limite diário de ${dailyLimit}.`
      });
    } else if (projectedTotal > dailyLimit * 0.8) {
      setLimitWarning({
        show: true,
        message: `Aviso: Com este agendamento, você terá ${projectedTotal} de ${dailyLimit} envios programados para este dia (${Math.round((projectedTotal / dailyLimit) * 100)}% do limite).`
      });
    } else {
      setLimitWarning({ show: false, message: '' });
    }
  }, [selectedDate, batches, batchContactsCount, settings]);

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

          {limitWarning.show && (
            <Alert variant={limitWarning.message.startsWith('Atenção') ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {limitWarning.message}
              </AlertDescription>
            </Alert>
          )}

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
