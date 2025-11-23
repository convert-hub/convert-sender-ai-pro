import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CampaignTemplate, AIInstructions } from '@/types/dispatch';
import { useDispatch } from '@/contexts/DispatchContext';
import { validateAIInstructions } from '@/utils/campaignValidation';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit, Plus, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateManagerProps {
  open: boolean;
  onClose: () => void;
}

export const TemplateManager = ({ open, onClose }: TemplateManagerProps) => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CampaignTemplate | null>(null);
  
  const [formData, setFormData] = useState<Partial<CampaignTemplate>>({
    name: '',
    description: '',
    ai_instructions: {
      identidade: '',
      objetivo: '',
      tom_estilo: '',
      cta: '',
      restricoes: '',
    },
  });

  const handleStartEdit = (template?: CampaignTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData(template);
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        ai_instructions: {
          identidade: '',
          objetivo: '',
          tom_estilo: '',
          cta: '',
          restricoes: '',
        },
      });
    }
    setIsEditing(true);
  };

  const handleDuplicate = (template: CampaignTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Cópia)`,
      description: template.description,
      ai_instructions: { ...template.ai_instructions },
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      ai_instructions: {
        identidade: '',
        objetivo: '',
        tom_estilo: '',
        cta: '',
        restricoes: '',
      },
    });
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'O template precisa ter um nome',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description?.trim()) {
      toast({
        title: 'Descrição obrigatória',
        description: 'O template precisa ter uma descrição',
        variant: 'destructive',
      });
      return;
    }

    const validation = validateAIInstructions(formData.ai_instructions || {});
    
    if (!validation.isValid) {
      toast({
        title: 'Erro de validação',
        description: validation.errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    if (editingTemplate) {
      updateTemplate(editingTemplate.id, formData);
      toast({
        title: 'Template atualizado',
        description: 'As alterações foram salvas com sucesso',
      });
    } else {
      const newTemplate: CampaignTemplate = {
        id: `template_custom_${Date.now()}`,
        name: formData.name!,
        description: formData.description!,
        ai_instructions: formData.ai_instructions!,
        is_custom: true,
        created_at: new Date().toISOString(),
      };
      
      addTemplate(newTemplate);
      toast({
        title: 'Template criado',
        description: 'O novo template foi criado com sucesso',
      });
    }

    handleCancelEdit();
  };

  const handleDelete = (templateId: string) => {
    deleteTemplate(templateId);
    toast({
      title: 'Template deletado',
      description: 'O template foi removido com sucesso',
    });
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Gerenciar Templates</SheetTitle>
          <SheetDescription>
            Crie e organize templates de instruções para IA
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isEditing ? (
            <div className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nome do Template *</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Template de Captação"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Descrição *</Label>
                <Textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva quando usar este template..."
                  rows={2}
                />
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="font-semibold">Instruções para IA</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="t-identidade">Identidade *</Label>
                  <Textarea
                    id="t-identidade"
                    value={formData.ai_instructions?.identidade}
                    onChange={(e) => updateAIInstructions('identidade', e.target.value)}
                    placeholder="Quem está falando?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-objetivo">Objetivo *</Label>
                  <Textarea
                    id="t-objetivo"
                    value={formData.ai_instructions?.objetivo}
                    onChange={(e) => updateAIInstructions('objetivo', e.target.value)}
                    placeholder="Qual o objetivo?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-tom">Tom e Estilo *</Label>
                  <Textarea
                    id="t-tom"
                    value={formData.ai_instructions?.tom_estilo}
                    onChange={(e) => updateAIInstructions('tom_estilo', e.target.value)}
                    placeholder="Como falar?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-cta">CTA *</Label>
                  <Textarea
                    id="t-cta"
                    value={formData.ai_instructions?.cta}
                    onChange={(e) => updateAIInstructions('cta', e.target.value)}
                    placeholder="Qual ação desejada?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="t-restricoes">Restrições *</Label>
                  <Textarea
                    id="t-restricoes"
                    value={formData.ai_instructions?.restricoes}
                    onChange={(e) => updateAIInstructions('restricoes', e.target.value)}
                    placeholder="O que NÃO fazer?"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Template
                </Button>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pr-4">
              <Button onClick={() => handleStartEdit()} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>

              {templates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum template disponível
                </p>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="text-sm mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                          <Badge variant={template.is_custom ? 'default' : 'secondary'}>
                            {template.is_custom ? 'Personalizado' : 'Padrão'}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="text-sm space-y-2">
                        <div>
                          <span className="font-medium">Identidade:</span>
                          <p className="text-muted-foreground line-clamp-1">
                            {template.ai_instructions.identidade}
                          </p>
                        </div>
                      </CardContent>

                      <CardFooter className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                          className="flex-1"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </Button>
                        
                        {template.is_custom && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartEdit(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar template?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                    Deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
