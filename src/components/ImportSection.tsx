import { useState } from "react";
import { Upload, Link, FileSpreadsheet, Loader2, Settings, Home, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { parseCSV, parseXLSX, parseGoogleSheetsURL } from "@/utils/parsers";
import { generateExampleData } from "@/utils/exampleData";
import { useDispatch } from "@/contexts/DispatchContext";
import { useNavigate } from "react-router-dom";
import { CampaignSelector } from "@/components/CampaignSelector";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export const ImportSection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const { setParsedData, setSheetMeta, currentCampaignId } = useDispatch();
  const { incrementStats } = useUserSettings();
  const { templateSheetUrl } = useSystemSettings();
  const navigate = useNavigate();

  const handleFileUpload = async (file: File) => {
    if (!currentCampaignId) {
      toast({
        title: 'Selecione uma campanha',
        description: 'É necessário selecionar uma campanha antes de importar dados',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      let data;
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv") {
        data = await parseCSV(file);
      } else if (extension === "xlsx" || extension === "xls") {
        data = await parseXLSX(file);
      } else {
        throw new Error("Formato não suportado. Use .csv ou .xlsx");
      }

      setParsedData(data);
      setSheetMeta({
        origin: "upload",
        filename_or_url: file.name,
        total_rows: data.rows.length,
        campaign_id: currentCampaignId || '',
      });

      await incrementStats('uploads_total', 1);
      await incrementStats('rows_total', data.rows.length);


      toast({
        title: "Arquivo carregado!",
        description: `${data.rows.length} linhas detectadas`,
      });

      // Delay aumentado e verificação dupla de persistência antes de navegar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Primeira verificação
      let savedData = sessionStorage.getItem('session_parsed_data');
      if (!savedData) {
        // Tentar salvar manualmente novamente
        console.warn('[ImportSection] Dados não encontrados, tentando salvar novamente');
        sessionStorage.setItem('session_parsed_data', JSON.stringify(data));
        await new Promise(resolve => setTimeout(resolve, 50));
        savedData = sessionStorage.getItem('session_parsed_data');
      }
      
      // Verificação final e navegação
      if (savedData) {
        console.log('[ImportSection] Navegando para /map com dados confirmados');
        navigate("/map");
      } else {
        console.error('[ImportSection] Data not saved to sessionStorage após retry');
        toast({
          title: 'Erro',
          description: 'Falha ao salvar dados. Tente novamente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlLoad = async () => {
    if (!currentCampaignId) {
      toast({
        title: 'Selecione uma campanha',
        description: 'É necessário selecionar uma campanha antes de importar dados',
        variant: 'destructive',
      });
      return;
    }

    if (!sheetUrl.trim()) {
      toast({
        title: "URL vazia",
        description: "Por favor, insira uma URL válida",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const data = await parseGoogleSheetsURL(sheetUrl);

      setParsedData(data);
      setSheetMeta({
        origin: "url",
        filename_or_url: sheetUrl,
        total_rows: data.rows.length,
        campaign_id: currentCampaignId || '',
      });

      await incrementStats('uploads_total', 1);
      await incrementStats('rows_total', data.rows.length);


      toast({
        title: "Planilha carregada!",
        description: `${data.rows.length} linhas detectadas`,
      });

      // Delay aumentado e verificação dupla de persistência antes de navegar
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Primeira verificação
      let savedData = sessionStorage.getItem('session_parsed_data');
      if (!savedData) {
        // Tentar salvar manualmente novamente
        console.warn('[ImportSection] Dados não encontrados, tentando salvar novamente');
        sessionStorage.setItem('session_parsed_data', JSON.stringify(data));
        await new Promise(resolve => setTimeout(resolve, 50));
        savedData = sessionStorage.getItem('session_parsed_data');
      }
      
      // Verificação final e navegação
      if (savedData) {
        console.log('[ImportSection] Navegando para /map com dados confirmados');
        navigate("/map");
      } else {
        console.error('[ImportSection] Data not saved to sessionStorage após retry');
        toast({
          title: 'Erro',
          description: 'Falha ao salvar dados. Tente novamente.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar planilha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleData = () => {
    if (!currentCampaignId) {
      toast({
        title: 'Selecione uma campanha',
        description: 'É necessário selecionar uma campanha antes de importar dados',
        variant: 'destructive',
      });
      return;
    }

    const data = generateExampleData();
    setParsedData(data);
    setSheetMeta({
      origin: "upload",
      filename_or_url: "exemplo-120-contatos.csv",
      total_rows: data.rows.length,
      campaign_id: currentCampaignId || '',
    });

    incrementStats('uploads_total', 1);
    incrementStats('rows_total', data.rows.length);


    toast({
      title: "Dados de exemplo carregados!",
      description: "120 contatos fictícios prontos para teste",
    });

    // Delay aumentado e verificação dupla de persistência antes de navegar
    setTimeout(async () => {
      // Primeira verificação
      let savedData = sessionStorage.getItem('session_parsed_data');
      if (!savedData) {
        // Tentar salvar manualmente novamente
        console.warn('[ImportSection] Dados não encontrados, tentando salvar novamente');
        sessionStorage.setItem('session_parsed_data', JSON.stringify(data));
        await new Promise(resolve => setTimeout(resolve, 50));
        savedData = sessionStorage.getItem('session_parsed_data');
      }
      
      // Verificação final e navegação
      if (savedData) {
        console.log('[ImportSection] Navegando para /map com dados confirmados');
        navigate("/map");
      } else {
        console.error('[ImportSection] Data not saved to sessionStorage após retry');
        toast({
          title: 'Erro',
          description: 'Falha ao salvar dados. Tente novamente.',
          variant: 'destructive',
        });
      }
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex justify-between mb-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <Home className="mr-2 h-4 w-4" />
          Voltar para Home
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} title="Configurações">
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Disparos em Lote</h1>
        <p className="text-lg text-muted-foreground">Importe sua base de contatos e envie disparos segmentados</p>
      </div>

      <CampaignSelector />

      {/* Template Card - Only show if template is configured */}
      {templateSheetUrl && (
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Template Disponível
            </CardTitle>
            <CardDescription>
              Use nosso modelo pronto para organizar seus contatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.open(templateSheetUrl, '_blank');
                  toast({
                    title: 'Template aberto',
                    description: 'Faça uma cópia do template para sua conta Google',
                  });
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(templateSheetUrl);
                  toast({
                    title: 'Link copiado!',
                    description: 'O link do template foi copiado para a área de transferência',
                  });
                }}
              >
                <Link className="mr-2 h-4 w-4" />
                Copiar Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 Abra o template, faça uma cópia (Arquivo → Fazer uma cópia), preencha seus dados e depois importe aqui.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload de Arquivo
            </CardTitle>
            <CardDescription>Arraste ou selecione um arquivo .csv ou .xlsx</CardDescription>
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
                  <span className="text-sm text-muted-foreground">Clique ou arraste o arquivo</span>
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
            <CardDescription>Cole o link de export CSV da planilha pública</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                disabled={isLoading}
              />
              <Button onClick={handleUrlLoad} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar Planilha"
                )}
              </Button>
              <p className="text-xs text-muted-foreground">💡 Dica: Use Arquivo → Fazer download → CSV (.csv)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
