import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Plus, Target } from 'lucide-react';
import { useDispatch } from '@/contexts/DispatchContext';
import { CampaignCard } from '@/components/CampaignCard';
import { CampaignForm } from '@/components/CampaignForm';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Campaign } from '@/types/dispatch';

const Campaigns = () => {
  const { campaigns } = useDispatch();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pausedCampaigns = campaigns.filter(c => c.status === 'paused');
  const archivedCampaigns = campaigns.filter(c => c.status === 'archived');

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              Campanhas
            </h1>
            <p className="text-muted-foreground">
              Organize seus disparos e personalize as instruções para IA
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Campanha
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma campanha criada ainda
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Crie sua primeira campanha para começar a organizar seus disparos e 
              dar contexto para a IA personalizar cada mensagem.
            </p>
            <Button onClick={() => setIsFormOpen(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Criar Primeira Campanha
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="active">
                Ativas ({activeCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Pausadas ({pausedCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Arquivadas ({archivedCampaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6">
              {activeCampaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha ativa
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {activeCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="paused" className="mt-6">
              {pausedCampaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha pausada
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pausedCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="archived" className="mt-6">
              {archivedCampaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma campanha arquivada
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {archivedCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <CampaignForm
          open={isFormOpen}
          onClose={handleCloseForm}
          campaign={editingCampaign}
        />
      </div>
    </Layout>
  );
};

export default Campaigns;
