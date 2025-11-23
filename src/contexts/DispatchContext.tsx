import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParsedData, ColumnMapping, BatchInfo, DispatchHistory, SheetMeta, Campaign, CampaignTemplate, AIInstructions } from '@/types/dispatch';

interface DispatchContextType {
  parsedData: ParsedData | null;
  setParsedData: (data: ParsedData | null) => void;
  
  sheetMeta: SheetMeta | null;
  setSheetMeta: (meta: SheetMeta | null) => void;
  
  columnMapping: ColumnMapping | null;
  setColumnMapping: (mapping: ColumnMapping | null) => void;
  
  batches: BatchInfo[];
  setBatches: (batches: BatchInfo[]) => void;
  
  history: DispatchHistory[];
  addToHistory: (entry: DispatchHistory) => void;
  clearHistory: () => void;
  
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  
  currentCampaignId: string | null;
  setCurrentCampaignId: (id: string | null) => void;
  
  templates: CampaignTemplate[];
  setTemplates: (templates: CampaignTemplate[]) => void;
  addTemplate: (template: CampaignTemplate) => void;
  updateTemplate: (id: string, updates: Partial<CampaignTemplate>) => void;
  deleteTemplate: (id: string) => void;
  
  stats: {
    uploads_total: number;
    rows_total: number;
    rows_valid: number;
    rows_invalid: number;
    batches_total: number;
    batches_sent: number;
  };
  updateStats: (updates: Partial<DispatchContextType['stats']>) => void;
  incrementStats: (increments: Partial<DispatchContextType['stats']>) => void;
  
  reset: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

const DEFAULT_WEBHOOK_URL = 'https://n8n.converthub.com.br/webhook/disparos-precatorizei';

const DEFAULT_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'template_captacao',
    name: 'Captação de Clientes',
    description: 'Template para primeiros contatos de captação',
    is_custom: false,
    created_at: new Date().toISOString(),
    ai_instructions: {
      identidade: 'Representante comercial da empresa',
      objetivo: 'Apresentar serviços e identificar interesse',
      tom_estilo: 'Profissional e consultivo',
      cta: 'Agendar uma conversa',
      restricoes: 'Não fazer promessas de resultados, não ser invasivo'
    }
  },
  {
    id: 'template_relacionamento',
    name: 'Relacionamento com Clientes',
    description: 'Template para clientes já existentes',
    is_custom: false,
    created_at: new Date().toISOString(),
    ai_instructions: {
      identidade: 'Gerente de relacionamento',
      objetivo: 'Manter contato e identificar novas oportunidades',
      tom_estilo: 'Amigável e próximo',
      cta: 'Conversar sobre como podemos ajudar',
      restricoes: 'Não ser repetitivo, não forçar venda'
    }
  },
  {
    id: 'template_reativacao',
    name: 'Reativação de Leads',
    description: 'Template para reativar contatos inativos',
    is_custom: false,
    created_at: new Date().toISOString(),
    ai_instructions: {
      identidade: 'Consultor da empresa',
      objetivo: 'Reengajar leads que não responderam anteriormente',
      tom_estilo: 'Educado e interessado',
      cta: 'Descobrir se ainda há interesse',
      restricoes: 'Não ser insistente, respeitar desinteresse'
    }
  }
];

const STORAGE_KEYS = {
  webhookUrl: 'dispatch_webhook_url',
  stats: 'dispatch_stats',
  history: 'dispatch_history',
  batches: 'dispatch_batches',
  parsedData: 'dispatch_parsed_data',
  sheetMeta: 'dispatch_sheet_meta',
  columnMapping: 'dispatch_column_mapping',
  campaigns: 'dispatch_campaigns',
  currentCampaignId: 'dispatch_current_campaign_id',
  templates: 'dispatch_campaign_templates',
};

export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parsedData, setParsedData] = useState<ParsedData | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.parsedData);
    return stored ? JSON.parse(stored) : null;
  });
  
  const [sheetMeta, setSheetMeta] = useState<SheetMeta | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.sheetMeta);
    return stored ? JSON.parse(stored) : null;
  });
  
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.columnMapping);
    return stored ? JSON.parse(stored) : null;
  });
  
  const [batches, setBatches] = useState<BatchInfo[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.batches);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [history, setHistory] = useState<DispatchHistory[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.history);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.webhookUrl);
    return stored || DEFAULT_WEBHOOK_URL;
  });
  
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.campaigns);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.currentCampaignId);
    return stored || null;
  });
  
  const [templates, setTemplates] = useState<CampaignTemplate[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.templates);
    return stored ? JSON.parse(stored) : DEFAULT_TEMPLATES;
  });
  
  const [stats, setStats] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.stats);
    return stored ? JSON.parse(stored) : {
      uploads_total: 0,
      rows_total: 0,
      rows_valid: 0,
      rows_invalid: 0,
      batches_total: 0,
      batches_sent: 0,
    };
  });

  // Persist stats to localStorage
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
  }, [stats]);

  // Persist history to localStorage
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  // Persist batches to localStorage
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.batches, JSON.stringify(batches));
  }, [batches]);

  // Persist parsedData to localStorage
  React.useEffect(() => {
    if (parsedData) {
      localStorage.setItem(STORAGE_KEYS.parsedData, JSON.stringify(parsedData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.parsedData);
    }
  }, [parsedData]);

  // Persist sheetMeta to localStorage
  React.useEffect(() => {
    if (sheetMeta) {
      localStorage.setItem(STORAGE_KEYS.sheetMeta, JSON.stringify(sheetMeta));
    } else {
      localStorage.removeItem(STORAGE_KEYS.sheetMeta);
    }
  }, [sheetMeta]);

  // Persist columnMapping to localStorage
  React.useEffect(() => {
    if (columnMapping) {
      localStorage.setItem(STORAGE_KEYS.columnMapping, JSON.stringify(columnMapping));
    } else {
      localStorage.removeItem(STORAGE_KEYS.columnMapping);
    }
  }, [columnMapping]);
  
  // Persist campaigns to localStorage
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.campaigns, JSON.stringify(campaigns));
  }, [campaigns]);
  
  // Persist currentCampaignId to localStorage
  React.useEffect(() => {
    if (currentCampaignId) {
      localStorage.setItem(STORAGE_KEYS.currentCampaignId, currentCampaignId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentCampaignId);
    }
  }, [currentCampaignId]);
  
  // Persist templates to localStorage
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.templates, JSON.stringify(templates));
  }, [templates]);

  const setWebhookUrl = (url: string) => {
    setWebhookUrlState(url);
    localStorage.setItem(STORAGE_KEYS.webhookUrl, url);
  };

  const addToHistory = (entry: DispatchHistory) => {
    setHistory(prev => [entry, ...prev]);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEYS.history);
  };
  
  const addCampaign = (campaign: Campaign) => {
    setCampaigns(prev => [...prev, campaign]);
  };
  
  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  
  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (currentCampaignId === id) {
      setCurrentCampaignId(null);
    }
  };
  
  const addTemplate = (template: CampaignTemplate) => {
    setTemplates(prev => [...prev, template]);
  };
  
  const updateTemplate = (id: string, updates: Partial<CampaignTemplate>) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  
  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const updateStats = (updates: Partial<typeof stats>) => {
    setStats(prev => ({ ...prev, ...updates }));
  };

  const incrementStats = (increments: Partial<typeof stats>) => {
    setStats(prev => ({
      ...prev,
      uploads_total: prev.uploads_total + (increments.uploads_total || 0),
      rows_total: prev.rows_total + (increments.rows_total || 0),
      batches_sent: prev.batches_sent + (increments.batches_sent || 0),
    }));
  };

  const reset = () => {
    setParsedData(null);
    setSheetMeta(null);
    setColumnMapping(null);
    setBatches([]);
    localStorage.removeItem(STORAGE_KEYS.batches);
    localStorage.removeItem(STORAGE_KEYS.parsedData);
    localStorage.removeItem(STORAGE_KEYS.sheetMeta);
    localStorage.removeItem(STORAGE_KEYS.columnMapping);
  };

  return (
    <DispatchContext.Provider
      value={{
        parsedData,
        setParsedData,
        sheetMeta,
        setSheetMeta,
        columnMapping,
        setColumnMapping,
        batches,
        setBatches,
        history,
        addToHistory,
        clearHistory,
        webhookUrl,
        setWebhookUrl,
        campaigns,
        setCampaigns,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        currentCampaignId,
        setCurrentCampaignId,
        templates,
        setTemplates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        stats,
        updateStats,
        incrementStats,
        reset,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
};

export const useDispatch = () => {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error('useDispatch must be used within DispatchProvider');
  }
  return context;
};
