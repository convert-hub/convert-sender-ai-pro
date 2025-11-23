import { useState, useRef } from 'react';
import { Upload, Link, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { parseCSV, parseXLSX, parseGoogleSheetsURL } from '@/utils/parsers';
import { generateExampleData } from '@/utils/exampleData';
import { useDispatch } from '@/contexts/DispatchContext';
import { useNavigate } from 'react-router-dom';

export const QuickActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setParsedData, setSheetMeta, incrementStats, currentCampaignId } = useDispatch();
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
        campaign_id: currentCampaignId || '',
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
        campaign_id: currentCampaignId || '',
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
      setShowUrlInput(false);
      setSheetUrl('');
    }
  };

  const handleExampleData = () => {
    const data = generateExampleData();
    setParsedData(data);
    setSheetMeta({
      origin: 'upload',
      filename_or_url: 'exemplo-120-contatos.csv',
      total_rows: data.rows.length,
      campaign_id: currentCampaignId || '',
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
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        Ações Rápidas
      </h2>
      
      <div className="grid md:grid-cols-3 gap-4">
        {/* Upload Card */}
        <Card className="hover-scale cursor-pointer border-primary/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Upload de Arquivo</CardTitle>
            <CardDescription>CSV ou XLSX</CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              disabled={isLoading}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Escolher Arquivo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Google Sheets URL Card */}
        <Card className="hover-scale cursor-pointer border-secondary/20 hover:border-secondary/40 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/10 flex items-center justify-center mb-3">
              <Link className="h-6 w-6 text-secondary" />
            </div>
            <CardTitle className="text-lg">Google Sheets</CardTitle>
            <CardDescription>Importar por URL</CardDescription>
          </CardHeader>
          <CardContent>
            {!showUrlInput ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowUrlInput(true)}
                disabled={isLoading}
              >
                <Link className="mr-2 h-4 w-4" />
                Inserir URL
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Cole a URL aqui..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUrlLoad();
                    if (e.key === 'Escape') {
                      setShowUrlInput(false);
                      setSheetUrl('');
                    }
                  }}
                  disabled={isLoading}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUrlLoad}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Carregar'
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowUrlInput(false);
                      setSheetUrl('');
                    }}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Example Data Card */}
        <Card className="hover-scale cursor-pointer border-accent/20 hover:border-accent/40 hover:shadow-lg transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center mb-3">
              <FileSpreadsheet className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-lg">Dados de Teste</CardTitle>
            <CardDescription>120 contatos exemplo</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExampleData}
              disabled={isLoading}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Carregar Exemplo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
