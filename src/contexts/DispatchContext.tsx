import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParsedData, ColumnMapping, SheetMeta, CampaignTemplate, AIInstructions } from '@/types/dispatch';

interface DispatchContextType {
  // Temporary session data only
  parsedData: ParsedData | null;
  setParsedData: (data: ParsedData | null) => void;
  
  sheetMeta: SheetMeta | null;
  setSheetMeta: (meta: SheetMeta | null) => void;
  
  columnMapping: ColumnMapping | null;
  setColumnMapping: (mapping: ColumnMapping | null) => void;
  
  currentCampaignId: string | null;
  setCurrentCampaignId: (id: string | null) => void;
  
  templates: CampaignTemplate[];
  setTemplates: (templates: CampaignTemplate[]) => void;
  addTemplate: (template: CampaignTemplate) => void;
  updateTemplate: (id: string, updates: Partial<CampaignTemplate>) => void;
  deleteTemplate: (id: string) => void;
  
  reset: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

const DEFAULT_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'template_captacao',
    name: 'Captação de Clientes',
    description: 'Template otimizado para conquistar novos clientes',
    ai_instructions: {
      identidade: 'Representante comercial especializado em identificar oportunidades de negócio',
      objetivo: 'Despertar interesse e agendar uma primeira conversa com prospects qualificados',
      tom_estilo: 'Profissional porém acessível, com foco em resolver problemas do cliente',
      cta: 'Solicitar agendamento de reunião de 30 minutos para apresentar soluções personalizadas',
      restricoes: 'Não fazer promessas específicas sobre descontos ou preços sem análise prévia do caso',
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'template_relacionamento',
    name: 'Relacionamento com Cliente',
    description: 'Template para nutrição e engajamento de clientes existentes',
    ai_instructions: {
      identidade: 'Gerente de sucesso do cliente dedicado ao crescimento e satisfação',
      objetivo: 'Fortalecer relacionamento e identificar oportunidades de upsell/cross-sell',
      tom_estilo: 'Amigável e consultivo, demonstrando conhecimento do histórico do cliente',
      cta: 'Agendar check-in para avaliar satisfação e discutir novas necessidades',
      restricoes: 'Não ser invasivo ou insistente, respeitar o timing e prioridades do cliente',
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'template_reativacao',
    name: 'Reativação de Leads',
    description: 'Template para reengajar leads inativos ou perdidos',
    ai_instructions: {
      identidade: 'Consultor especializado em reconectar e criar novas oportunidades',
      objetivo: 'Reacender interesse e entender o que mudou desde último contato',
      tom_estilo: 'Empático e curioso, reconhecendo que houve um período de silêncio',
      cta: 'Propor uma conversa rápida para entender momento atual e como podemos ajudar',
      restricoes: 'Não ser agressivo ou culpar o lead pelo silêncio, focar no valor presente',
    },
    is_custom: false,
    created_at: new Date().toISOString(),
  },
];

const STORAGE_KEYS = {
  CURRENT_CAMPAIGN_ID: 'current_campaign_id',
  TEMPLATES: 'dispatch_templates',
};

export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Temporary session data
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [sheetMeta, setSheetMeta] = useState<SheetMeta | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    return saved || null;
  });
  
  // Templates (still localStorage for now, can be migrated later)
  const [templates, setTemplates] = useState<CampaignTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_TEMPLATES;
      }
    }
    return DEFAULT_TEMPLATES;
  });

  // Persist current campaign ID
  useEffect(() => {
    if (currentCampaignId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID, currentCampaignId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    }
  }, [currentCampaignId]);

  // Persist templates
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  const addTemplate = (template: CampaignTemplate) => {
    setTemplates(prev => [...prev, template]);
  };

  const updateTemplate = (id: string, updates: Partial<CampaignTemplate>) => {
    setTemplates(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const reset = () => {
    setParsedData(null);
    setSheetMeta(null);
    setColumnMapping(null);
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
        currentCampaignId,
        setCurrentCampaignId,
        templates,
        setTemplates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        reset,
      }}
    >
      {children}
    </DispatchContext.Provider>
  );
};

export const useDispatch = () => {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error('useDispatch must be used within a DispatchProvider');
  }
  return context;
};
