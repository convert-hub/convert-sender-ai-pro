import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParsedData, ColumnMapping, SheetMeta } from '@/types/dispatch';
import { saveToIndexedDB, getFromIndexedDB, clearFromIndexedDB } from '@/utils/indexedDB';

interface DispatchContextType {
  // Temporary session data only
  parsedData: ParsedData | null;
  setParsedData: (data: ParsedData | null) => Promise<boolean>;
  
  sheetMeta: SheetMeta | null;
  setSheetMeta: (meta: SheetMeta | null) => void;
  
  columnMapping: ColumnMapping | null;
  setColumnMapping: (mapping: ColumnMapping | null) => void;
  
  currentCampaignId: string | null;
  setCurrentCampaignId: (id: string | null) => void;
  
  reset: () => Promise<void>;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_CAMPAIGN_ID: 'current_campaign_id',
  PARSED_DATA: 'session_parsed_data',
  SHEET_META: 'session_sheet_meta',
  COLUMN_MAPPING: 'session_column_mapping',
};

const IDB_KEYS = {
  PARSED_DATA: 'parsed_data',
  SHEET_META: 'sheet_meta',
};

export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parsedData, setParsedDataInternal] = useState<ParsedData | null>(null);
  const [sheetMeta, setSheetMetaInternal] = useState<SheetMeta | null>(null);
  const [columnMapping, setColumnMappingInternal] = useState<ColumnMapping | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.COLUMN_MAPPING);
    return saved ? JSON.parse(saved) : null;
  });
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    return saved || null;
  });

  // Carregar dados do IndexedDB na inicialização
  useEffect(() => {
    const loadFromStorage = async () => {
      // Tentar IndexedDB primeiro
      const idbData = await getFromIndexedDB<ParsedData>(IDB_KEYS.PARSED_DATA);
      if (idbData) {
        console.log('[DispatchContext] Loaded parsedData from IndexedDB');
        setParsedDataInternal(idbData);
      } else {
        // Fallback para sessionStorage (dados pequenos ou browser antigo)
        try {
          const saved = sessionStorage.getItem(STORAGE_KEYS.PARSED_DATA);
          if (saved) {
            console.log('[DispatchContext] Loaded parsedData from sessionStorage');
            setParsedDataInternal(JSON.parse(saved));
          }
        } catch (e) {
          console.error('[DispatchContext] Error parsing sessionStorage:', e);
        }
      }

      // Carregar sheetMeta
      const idbMeta = await getFromIndexedDB<SheetMeta>(IDB_KEYS.SHEET_META);
      if (idbMeta) {
        setSheetMetaInternal(idbMeta);
      } else {
        const savedMeta = sessionStorage.getItem(STORAGE_KEYS.SHEET_META);
        if (savedMeta) {
          setSheetMetaInternal(JSON.parse(savedMeta));
        }
      }
    };

    loadFromStorage();
  }, []);

  // Função async para salvar dados - usa IndexedDB para dados grandes
  const setParsedData = async (data: ParsedData | null): Promise<boolean> => {
    if (data) {
      // Sempre usar IndexedDB como armazenamento principal (suporta dados grandes)
      const saved = await saveToIndexedDB(IDB_KEYS.PARSED_DATA, data);
      
      if (saved) {
        console.log('[DispatchContext] Data saved to IndexedDB successfully');
        // Limpar sessionStorage se existir dados antigos
        sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
      } else {
        // Fallback: tentar sessionStorage (pode falhar com dados grandes)
        console.warn('[DispatchContext] IndexedDB failed, trying sessionStorage...');
        try {
          sessionStorage.setItem(STORAGE_KEYS.PARSED_DATA, JSON.stringify(data));
        } catch (error) {
          const storageError = error as { name?: string };
          if (storageError.name === 'QuotaExceededError') {
            console.error('[DispatchContext] QuotaExceededError - data too large');
            return false;
          }
          throw error;
        }
      }
    } else {
      await clearFromIndexedDB(IDB_KEYS.PARSED_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
    }
    
    setParsedDataInternal(data);
    return true;
  };

  const setSheetMeta = (meta: SheetMeta | null) => {
    if (meta) {
      // Salvar em ambos os storages para compatibilidade
      saveToIndexedDB(IDB_KEYS.SHEET_META, meta);
      sessionStorage.setItem(STORAGE_KEYS.SHEET_META, JSON.stringify(meta));
    } else {
      clearFromIndexedDB(IDB_KEYS.SHEET_META);
      sessionStorage.removeItem(STORAGE_KEYS.SHEET_META);
    }
    setSheetMetaInternal(meta);
  };

  const setColumnMapping = (mapping: ColumnMapping | null) => {
    if (mapping) {
      sessionStorage.setItem(STORAGE_KEYS.COLUMN_MAPPING, JSON.stringify(mapping));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.COLUMN_MAPPING);
    }
    setColumnMappingInternal(mapping);
  };

  // Persist current campaign ID
  useEffect(() => {
    if (currentCampaignId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID, currentCampaignId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    }
  }, [currentCampaignId]);

  const reset = async () => {
    await clearFromIndexedDB(IDB_KEYS.PARSED_DATA);
    await clearFromIndexedDB(IDB_KEYS.SHEET_META);
    sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.SHEET_META);
    sessionStorage.removeItem(STORAGE_KEYS.COLUMN_MAPPING);
    setParsedDataInternal(null);
    setSheetMetaInternal(null);
    setColumnMappingInternal(null);
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
