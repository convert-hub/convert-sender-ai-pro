import { useState } from 'react';
import { Upload, Link, FileSpreadsheet, Loader2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { parseCSV, parseXLSX, parseGoogleSheetsURL } from '@/utils/parsers';
import { generateExampleData } from '@/utils/exampleData';
import { useDispatch } from '@/contexts/DispatchContext';
import { useNavigate } from 'react-router-dom';

export const ImportSection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const { setParsedData, setSheetMeta, incrementStats } = useDispatch();
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      let data;
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        data = await parseCSV(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        data = await parseXLSX(file);
      } else {
        throw new Error('Formato não suportado. Use .csv ou .xlsx');
      }
      
      setParsedData(data);
      setSheetMeta({
        origin: 'upload',
        filename_or_url: file.name,
        total_rows: data.rows.length,
      });
      
      incrementStats({
        uploads_total: 1,
        rows_total: data.rows.length,
      });
      
      toast({
        title: 'Arquivo carregado!',
        description: `${data.rows.length} linhas detectadas`,
      });
      
      navigate('/map');
    } catch (error) {
      toast({
        title: 'Erro ao processar arquivo',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlLoad = async () => {
    if (!sheetUrl.trim()) {
      toast({
        title: 'URL vazia',
        description: 'Por favor, insira uma URL válida',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await parseGoogleSheetsURL(sheetUrl);
      
      setParsedData(data);
      setSheetMeta({
        origin: 'url',
        filename_or_url: sheetUrl,
        total_rows: data.rows.length,
      });
      
      incrementStats({
        uploads_total: 1,
        rows_total: data.rows.length,
      });
      
      toast({
        title: 'Planilha carregada!',
        description: `${data.rows.length} linhas detectadas`,
      });
      
      navigate('/map');
    } catch (error) {
      toast({
        title: 'Erro ao carregar planilha',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleData = () => {
    const data = generateExampleData();
    setParsedData(data);
    setSheetMeta({
      origin: 'upload',
      filename_or_url: 'exemplo-120-contatos.csv',
      total_rows: data.rows.length,
    });
    
    incrementStats({
      uploads_total: 1,
      rows_total: data.rows.length,
    });
    
    toast({
      title: 'Dados de exemplo carregados!',
      description: '120 contatos fictícios prontos para teste',
    });
    
    navigate('/map');
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex justify-end mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/settings')}
          title="Configurações"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Disparos em Lote</h1>
        <p className="text-lg text-muted-foreground">
          Importe sua base de contatos e envie disparos segmentados
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>
              Arraste ou selecione um arquivo .csv ou .xlsx
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:border-primary transition-colors">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                disabled={isLoading}
              />
              {isLoading ? (
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                  <span className="text-sm text-muted-foreground">
                    Clique ou arraste o arquivo
                  </span>
                </>
              )}
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Link do Google Sheets
            </CardTitle>
            <CardDescription>
              Cole o link de export CSV da planilha pública
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button
                onClick={handleUrlLoad}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar Planilha'
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 Dica: Use Arquivo → Fazer download → CSV (.csv)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={handleExampleData}
          disabled={isLoading}
        >
          Carregar Dados de Exemplo (120 contatos)
        </Button>
      </div>
    </div>
  );
};
