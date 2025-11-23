import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Campaign, AIInstructions, CampaignTemplate } from '@/types/dispatch';
import { useDispatch } from '@/contexts/DispatchContext';
import { validateCampaign } from '@/utils/campaignValidation';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Save, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TemplateManager } from './TemplateManager';
import { Separator } from '@/components/ui/separator';

interface CampaignFormProps {
  open: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
}

export const CampaignForm = ({ open, onClose, campaign }: CampaignFormProps) => {
  const { addCampaign, updateCampaign, templates } = useDispatch();
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '',
    objective: '',
    description: '',
    status: 'active',
    ai_instructions: {
      identidade: '',
      objetivo: '',
      tom_estilo: '',
      cta: '',
      restricoes: '',
    },
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    } else {
      setFormData({
        name: '',
        objective: '',
        description: '',
        status: 'active',
        ai_instructions: {
          identidade: '',
          objetivo: '',
          tom_estilo: '',
          cta: '',
          restricoes: '',
        },
      });
      setSelectedTemplateId('');
    }
  }, [campaign, open]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') return;
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        ai_instructions: { ...template.ai_instructions },
      }));
      
      toast({
        title: 'Template aplicado',
        description: `Instruções do template "${template.name}" foram carregadas`,
      });
    }
  };

  const handleSubmit = () => {
    const validation = validateCampaign(formData);
    
    if (!validation.isValid) {
      toast({
        title: 'Erro de validação',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    if (campaign) {
      updateCampaign(campaign.id, {
        ...formData,
        updated_at: new Date().toISOString(),
      } as Campaign);
      
      toast({
        title: 'Campanha atualizada',
        description: 'As alterações foram salvas com sucesso',
      });
    } else {
      const newCampaign: Campaign = {
        id: `campaign_${Date.now()}`,
        name: formData.name!,
        objective: formData.objective!,
        description: formData.description || '',
        status: 'active',
        ai_instructions: formData.ai_instructions!,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stats: {
          total_uploads: 0,
          total_contacts: 0,
          total_batches: 0,
          total_sent: 0,
          total_scheduled: 0,
        },
      };
      
      addCampaign(newCampaign);
      
      toast({
        title: 'Campanha criada',
        description: 'A nova campanha foi criada com sucesso',
      });
    }

    onClose();
  };

  const updateAIInstructions = (field: keyof AIInstructions, value: string) => {
    setFormData(prev => ({
      ...prev,
      ai_instructions: {
        ...prev.ai_instructions!,
        [field]: value,
      },
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {campaign ? 'Editar Campanha' : 'Nova Campanha'}
            </DialogTitle>
            <DialogDescription>
              Defina os detalhes da campanha e as instruções para personalização da IA
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">Informações Básicas</TabsTrigger>
              <TabsTrigger value="ai">
                <Sparkles className="mr-2 h-4 w-4" />
                Instruções para IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Captação Q1 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objetivo de Negócio *</Label>
                <Input
                  id="objective"
                  value={formData.objective}
                  onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  placeholder="Ex: Agendar reuniões com leads qualificados"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva mais detalhes sobre esta campanha..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="template">Template de Instruções</Label>
                  <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                    <SelectTrigger id="template">
                      <SelectValue placeholder="Selecione um template ou crie do zero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Criar do zero</SelectItem>
                      <Separator className="my-2" />
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {!template.is_custom && '(Padrão)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTemplateManagerOpen(true)}
                  className="mt-8"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Gerenciar Templates
                </Button>
              </div>

              <Separator className="my-6" />

              <TooltipProvider>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="identidade">Identidade *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Defina quem está falando. Dê personalidade e contexto.</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: "Consultora financeira com 10 anos de experiência"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="identidade"
                      value={formData.ai_instructions?.identidade}
                      onChange={(e) => updateAIInstructions('identidade', e.target.value)}
                      placeholder="Quem está falando?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="objetivo">Objetivo *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>O que você quer alcançar com este contato?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: "Agendar reunião de 30min para apresentar solução"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="objetivo"
                      value={formData.ai_instructions?.objetivo}
                      onChange={(e) => updateAIInstructions('objetivo', e.target.value)}
                      placeholder="Qual o objetivo do contato?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="tom_estilo">Tom e Estilo *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Como a IA deve se comunicar?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: "Profissional mas acessível, use linguagem simples"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="tom_estilo"
                      value={formData.ai_instructions?.tom_estilo}
                      onChange={(e) => updateAIInstructions('tom_estilo', e.target.value)}
                      placeholder="Como falar?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="cta">Call to Action (CTA) *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Qual ação você quer que o contato tome?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: "Responder com melhor dia/horário para conversar"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="cta"
                      value={formData.ai_instructions?.cta}
                      onChange={(e) => updateAIInstructions('cta', e.target.value)}
                      placeholder="Qual ação desejada?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="restricoes">Restrições *</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>O que a IA NÃO deve fazer?</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Ex: "Não prometer descontos, não enviar links externos"
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Textarea
                      id="restricoes"
                      value={formData.ai_instructions?.restricoes}
                      onChange={(e) => updateAIInstructions('restricoes', e.target.value)}
                      placeholder="O que NÃO fazer?"
                      rows={2}
                    />
                  </div>
                </div>
              </TooltipProvider>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {campaign ? 'Salvar Alterações' : 'Criar Campanha'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TemplateManager
        open={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
    </>
  );
};
