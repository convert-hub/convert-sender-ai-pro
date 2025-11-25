import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { useDispatch } from '@/contexts/DispatchContext';
import { createBatches } from '@/utils/validation';
import { Badge } from '@/components/ui/badge';
import { CampaignSelector } from './CampaignSelector';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBatches } from '@/hooks/useBatches';
import { toast as sonnerToast } from 'sonner';

export const MappingSection = () => {
  const navigate = useNavigate();
  const { parsedData, setColumnMapping, sheetMeta, currentCampaignId, setSheetMeta } = useDispatch();
  const { updateStats } = useUserSettings();
  const { addBatch } = useBatches();
  
  const [nameCol, setNameCol] = useState('');
  const [emailCol, setEmailCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [extraCols, setExtraCols] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState(50);
  const [isInitializing, setIsInitializing] = useState(true);

  // Redirect if no data (com delay para evitar race condition)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!parsedData) {
        navigate('/');
      }
      setIsInitializing(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [parsedData, navigate]);

  useEffect(() => {
    if (!parsedData) {
      return;
    }

    // Auto-detect columns
    const headers = parsedData.headers;
    
    const findColumn = (keywords: string[]) => {
      return headers.find(h =>
        keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
      ) || '';
    };

    setNameCol(findColumn(['nome', 'name']));
    setEmailCol(findColumn(['email', 'e-mail']));
    setPhoneCol(findColumn(['telefone', 'phone', 'celular', 'tel']));
  }, [parsedData, navigate]);

  useEffect(() => {
    if (currentCampaignId && sheetMeta) {
      setSheetMeta({
        ...sheetMeta,
        campaign_id: currentCampaignId
      });
    }
  }, [currentCampaignId]);

  const handleExtraColToggle = (col: string) => {
    setExtraCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleGenerateBatches = async () => {
    if (!parsedData) return;

    const actualEmailCol = emailCol === 'none' ? '' : emailCol;
    const actualPhoneCol = phoneCol === 'none' ? '' : phoneCol;

    if (!actualEmailCol && !actualPhoneCol) {
      toast({
        title: 'Mapeamento incompleto',
        description: 'Você deve mapear ao menos Email ou Telefone',
        variant: 'destructive',
      });
      return;
    }

    const mapping = {
      name: nameCol === 'none' ? '' : nameCol,
      email: actualEmailCol,
      phone: actualPhoneCol,
      extras: extraCols,
    };

    const result = createBatches(parsedData.rows, mapping, batchSize, sheetMeta?.campaign_id);

    setColumnMapping(mapping);
    
    // Save batches to Supabase
    try {
      for (const batch of result.batches) {
        await addBatch(batch);
      }

      await updateStats({
        rows_valid: result.stats.valid,
        rows_invalid: result.stats.invalid,
        batches_total: result.batches.length,
      });

      sonnerToast.success(`${result.batches.length} blocos criados com sucesso`);
      navigate('/batches');
    } catch (error) {
      console.error('Error saving batches:', error);
    }
  };

  // Loading state durante inicialização
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!parsedData) return null;

  const availableHeaders = parsedData.headers;
  const extraHeaders = availableHeaders.filter(
    h => h !== nameCol && h !== emailCol && h !== phoneCol && nameCol !== 'none' && emailCol !== 'none' && phoneCol !== 'none'
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <CampaignSelector />
        
        <h1 className="text-3xl font-bold mb-2 mt-6">Mapear Colunas</h1>
        <p className="text-muted-foreground">
          Identifique quais colunas correspondem aos campos obrigatórios
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Campos Obrigatórios</CardTitle>
          <CardDescription>
            Ao menos Email ou Telefone deve ser mapeado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="name-col">Nome (opcional)</Label>
            <Select value={nameCol} onValueChange={setNameCol}>
              <SelectTrigger id="name-col">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {availableHeaders.map(h => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email-col">Email</Label>
            <Select value={emailCol} onValueChange={setEmailCol}>
              <SelectTrigger id="email-col">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {availableHeaders.map(h => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="phone-col">Telefone</Label>
            <Select value={phoneCol} onValueChange={setPhoneCol}>
              <SelectTrigger id="phone-col">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {availableHeaders.map(h => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {extraHeaders.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Campos Extras (opcional)</CardTitle>
            <CardDescription>
              Selecione campos adicionais para incluir no envio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {extraHeaders.map(h => (
                <div key={h} className="flex items-center space-x-2">
                  <Checkbox
                    id={`extra-${h}`}
                    checked={extraCols.includes(h)}
                    onCheckedChange={() => handleExtraColToggle(h)}
                  />
                  <label
                    htmlFor={`extra-${h}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {h}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configuração de Lotes</CardTitle>
          <CardDescription>
            Defina quantos contatos cada lote terá (máximo 50)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="batch-size">Tamanho do Lote</Label>
            <Input
              id="batch-size"
              type="number"
              min="1"
              max="50"
              value={batchSize}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 50) {
                  setBatchSize(value);
                }
              }}
              className="w-32"
            />
            <p className="text-sm text-muted-foreground">
              Valor entre 1 e 50 contatos por lote
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Primeiras 3 linhas da planilha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {nameCol && nameCol !== 'none' && (
                    <th className="text-left p-2">
                      <Badge variant="secondary">Nome</Badge>
                    </th>
                  )}
                  {emailCol && emailCol !== 'none' && (
                    <th className="text-left p-2">
                      <Badge variant="secondary">Email</Badge>
                    </th>
                  )}
                  {phoneCol && phoneCol !== 'none' && (
                    <th className="text-left p-2">
                      <Badge variant="secondary">Telefone</Badge>
                    </th>
                  )}
                  {extraCols.map(col => (
                    <th key={col} className="text-left p-2">
                      <Badge variant="outline">{col}</Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.rows.slice(0, 3).map((row, idx) => (
                  <tr key={idx} className="border-b">
                    {nameCol && nameCol !== 'none' && <td className="p-2">{row[nameCol]}</td>}
                    {emailCol && emailCol !== 'none' && <td className="p-2">{row[emailCol]}</td>}
                    {phoneCol && phoneCol !== 'none' && <td className="p-2">{row[phoneCol]}</td>}
                    {extraCols.map(col => (
                      <td key={col} className="p-2">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleGenerateBatches}
          disabled={(!emailCol || emailCol === 'none') && (!phoneCol || phoneCol === 'none')}
        >
          Gerar Blocos de {batchSize}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
