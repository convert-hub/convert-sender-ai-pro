import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDispatch } from '@/contexts/DispatchContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Plus, Target, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CampaignForm } from './CampaignForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export const CampaignSelector = () => {
  const { currentCampaignId, setCurrentCampaignId } = useDispatch();
  const { campaigns, loading } = useCampaigns();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const selectedCampaign = activeCampaigns.find(c => c.id === currentCampaignId);

  // Valida se a campanha selecionada ainda está ativa
  useEffect(() => {
    if (!loading && currentCampaignId && campaigns.length > 0) {
      const isActiveSelected = activeCampaigns.some(c => c.id === currentCampaignId);
      if (!isActiveSelected) {
        setCurrentCampaignId(null);
        toast.info('A campanha selecionada foi arquivada. Por favor, selecione outra campanha.');
      }
    }
  }, [currentCampaignId, activeCampaigns, campaigns.length, loading, setCurrentCampaignId]);

  if (campaigns.length === 0) {
    return (
      <>
        <Alert className="mb-6">
          <Target className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium mb-1">Crie sua primeira campanha</p>
                <p className="text-sm text-muted-foreground">
                  Organize seus disparos e personalize as instruções para IA
                </p>
              </div>
              <Button onClick={() => setIsFormOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Criar Campanha
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <CampaignForm
          open={isFormOpen}
          onClose={() => setIsFormOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Campanha
              </CardTitle>
              <CardDescription>
                Selecione a campanha para este envio
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Select
              value={currentCampaignId || ''}
              onValueChange={setCurrentCampaignId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                {activeCampaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name} - {campaign.objective}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCampaign && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{selectedCampaign.name}</h4>
                <Badge className="bg-success text-success-foreground">
                  Ativa
                </Badge>
              </div>
              
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Objetivo:</span>
                  <p className="text-muted-foreground">{selectedCampaign.objective}</p>
                </div>
                
                {selectedCampaign.description && (
                  <div>
                    <span className="font-medium">Descrição:</span>
                    <p className="text-muted-foreground">{selectedCampaign.description}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Instruções para IA configuradas:</p>
                      <ul className="space-y-1">
                        <li>• Identidade: {selectedCampaign.ai_instructions.identidade.slice(0, 50)}...</li>
                        <li>• Tom: {selectedCampaign.ai_instructions.tom_estilo.slice(0, 50)}...</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CampaignForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
};
