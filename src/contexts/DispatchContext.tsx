import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParsedData, ColumnMapping, SheetMeta } from '@/types/dispatch';

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
  
  reset: () => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CURRENT_CAMPAIGN_ID: 'current_campaign_id',
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

  // Persist current campaign ID
  useEffect(() => {
    if (currentCampaignId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID, currentCampaignId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    }
  }, [currentCampaignId]);

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
