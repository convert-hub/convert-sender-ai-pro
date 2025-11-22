import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParsedData, ColumnMapping, BatchInfo, DispatchHistory, SheetMeta } from '@/types/dispatch';

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
const STORAGE_KEYS = {
  webhookUrl: 'dispatch_webhook_url',
  stats: 'dispatch_stats',
  history: 'dispatch_history',
  batches: 'dispatch_batches',
  parsedData: 'dispatch_parsed_data',
  sheetMeta: 'dispatch_sheet_meta',
  columnMapping: 'dispatch_column_mapping',
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
