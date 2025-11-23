import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Campaign } from '@/types/dispatch';
import { Edit, Archive, Pause, Play, Trash2, Users, Send, Clock } from 'lucide-react';
import { useDispatch } from '@/contexts/DispatchContext';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
}

export const CampaignCard = ({ campaign, onEdit }: CampaignCardProps) => {
  const { updateCampaign, deleteCampaign, batches } = useDispatch();

  const handleStatusChange = (newStatus: Campaign['status']) => {
    updateCampaign(campaign.id, { 
      status: newStatus,
      updated_at: new Date().toISOString()
    });
    
    const statusText = {
      active: 'ativada',
      paused: 'pausada',
      archived: 'arquivada'
    }[newStatus];
    
    toast({
      title: 'Status alterado',
      description: `Campanha ${statusText} com sucesso`,
    });
  };

  const handleDelete = () => {
    const hasBatches = batches.some(b => b.campaign_id === campaign.id);
    
    if (hasBatches) {
      toast({
        title: 'Não é possível deletar',
        description: 'Esta campanha possui envios associados. Você pode arquivá-la.',
        variant: 'destructive',
      });
      return;
    }
    
    deleteCampaign(campaign.id);
    toast({
      title: 'Campanha deletada',
      description: 'A campanha foi removida com sucesso',
    });
  };

  const statusColors = {
    active: 'bg-success text-success-foreground',
    paused: 'bg-warning text-warning-foreground',
    archived: 'bg-muted text-muted-foreground',
  };

  const statusLabels = {
    active: 'Ativa',
    paused: 'Pausada',
    archived: 'Arquivada',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="line-clamp-1">{campaign.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {campaign.objective}
            </CardDescription>
          </div>
          <Badge className={statusColors[campaign.status]}>
            {statusLabels[campaign.status]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {campaign.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Contatos:</span>
            <span className="font-semibold">{campaign.stats.total_contacts}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Enviados:</span>
            <span className="font-semibold">{campaign.stats.total_sent}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Agendados:</span>
            <span className="font-semibold">{campaign.stats.total_scheduled}</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Atualizada em {format(new Date(campaign.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(campaign)} className="flex-1">
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>

        {campaign.status === 'active' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('paused')}
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}

        {campaign.status === 'paused' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('active')}
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {campaign.status !== 'archived' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('archived')}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}

        {campaign.status === 'archived' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar campanha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A campanha será permanentemente removida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};
