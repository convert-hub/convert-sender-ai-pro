import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ParsedData, ColumnMapping, SheetMeta } from '@/types/dispatch';
import { saveToIndexedDB, getFromIndexedDB, clearFromIndexedDB } from '@/utils/indexedDB';

interface DispatchContextType {
  parsedData: ParsedData | null;
  setParsedData: (data: ParsedData | null) => Promise<boolean>;
  
  sheetMeta: SheetMeta | null;
  setSheetMeta: (meta: SheetMeta | null) => void;
  
  columnMapping: ColumnMapping | null;
  setColumnMapping: (mapping: ColumnMapping | null) => void;
  
  currentCampaignId: string | null;
  setCurrentCampaignId: (id: string | null) => void;
  
  reset: () => Promise<void>;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [columnMapping, setColumnMappingInternal] = useState<ColumnMapping | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.COLUMN_MAPPING);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
      return saved || null;
    } catch {
      return null;
    }
  });

  // Carregar dados do IndexedDB na inicialização (após montagem)
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        // Tentar IndexedDB primeiro
        const idbData = await getFromIndexedDB<ParsedData>(IDB_KEYS.PARSED_DATA);
        if (idbData) {
          console.log('[DispatchContext] Loaded parsedData from IndexedDB');
          setParsedDataInternal(idbData);
        } else {
          // Fallback para sessionStorage
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
          try {
            const savedMeta = sessionStorage.getItem(STORAGE_KEYS.SHEET_META);
            if (savedMeta) {
              setSheetMetaInternal(JSON.parse(savedMeta));
            }
          } catch {
            // Ignore
          }
        }
      } catch (error) {
        console.error('[DispatchContext] Error loading from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromStorage();
  }, []);

  // Função async para salvar dados - usa IndexedDB para dados grandes
  const setParsedData = useCallback(async (data: ParsedData | null): Promise<boolean> => {
    if (data) {
      try {
        // Sempre usar IndexedDB como armazenamento principal (suporta dados grandes)
        const saved = await saveToIndexedDB(IDB_KEYS.PARSED_DATA, data);
        
        if (saved) {
          console.log('[DispatchContext] Data saved to IndexedDB successfully');
          // Limpar sessionStorage se existir dados antigos
          try {
            sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
          } catch {
            // Ignore
          }
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
      } catch (error) {
        console.error('[DispatchContext] Error saving data:', error);
        return false;
      }
    } else {
      try {
        await clearFromIndexedDB(IDB_KEYS.PARSED_DATA);
        sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
      } catch {
        // Ignore
      }
    }
    
    setParsedDataInternal(data);
    return true;
  }, []);

  const setSheetMeta = useCallback((meta: SheetMeta | null) => {
    if (meta) {
      // Salvar em ambos os storages para compatibilidade
      saveToIndexedDB(IDB_KEYS.SHEET_META, meta).catch(() => {});
      try {
        sessionStorage.setItem(STORAGE_KEYS.SHEET_META, JSON.stringify(meta));
      } catch {
        // Ignore
      }
    } else {
      clearFromIndexedDB(IDB_KEYS.SHEET_META).catch(() => {});
      try {
        sessionStorage.removeItem(STORAGE_KEYS.SHEET_META);
      } catch {
        // Ignore
      }
    }
    setSheetMetaInternal(meta);
  }, []);

  const setColumnMapping = useCallback((mapping: ColumnMapping | null) => {
    try {
      if (mapping) {
        sessionStorage.setItem(STORAGE_KEYS.COLUMN_MAPPING, JSON.stringify(mapping));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.COLUMN_MAPPING);
      }
    } catch {
      // Ignore
    }
    setColumnMappingInternal(mapping);
  }, []);

  // Persist current campaign ID
  useEffect(() => {
    try {
      if (currentCampaignId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID, currentCampaignId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
      }
    } catch {
      // Ignore
    }
  }, [currentCampaignId]);

  const reset = useCallback(async () => {
    try {
      await clearFromIndexedDB(IDB_KEYS.PARSED_DATA);
      await clearFromIndexedDB(IDB_KEYS.SHEET_META);
    } catch {
      // Ignore
    }
    try {
      sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
      sessionStorage.removeItem(STORAGE_KEYS.SHEET_META);
      sessionStorage.removeItem(STORAGE_KEYS.COLUMN_MAPPING);
    } catch {
      // Ignore
    }
    setParsedDataInternal(null);
    setSheetMetaInternal(null);
    setColumnMappingInternal(null);
  }, []);

  const value = {
    parsedData,
    setParsedData,
    sheetMeta,
    setSheetMeta,
    columnMapping,
    setColumnMapping,
    currentCampaignId,
    setCurrentCampaignId,
    reset,
    isLoading,
  };

  return (
    <DispatchContext.Provider value={value}>
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
