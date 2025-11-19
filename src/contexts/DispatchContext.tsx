import React, { createContext, useContext, useState } from 'react';
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
  
  stats: {
    uploads_total: number;
    rows_total: number;
    rows_valid: number;
    rows_invalid: number;
    batches_total: number;
    batches_sent: number;
  };
  updateStats: (updates: Partial<DispatchContextType['stats']>) => void;
  
  reset: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [sheetMeta, setSheetMeta] = useState<SheetMeta | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [history, setHistory] = useState<DispatchHistory[]>([]);
  const [stats, setStats] = useState({
    uploads_total: 0,
    rows_total: 0,
    rows_valid: 0,
    rows_invalid: 0,
    batches_total: 0,
    batches_sent: 0,
  });

  const addToHistory = (entry: DispatchHistory) => {
    setHistory(prev => [entry, ...prev]);
  };

  const updateStats = (updates: Partial<typeof stats>) => {
    setStats(prev => ({ ...prev, ...updates }));
  };

  const reset = () => {
    setParsedData(null);
    setSheetMeta(null);
    setColumnMapping(null);
    setBatches([]);
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
        stats,
        updateStats,
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
