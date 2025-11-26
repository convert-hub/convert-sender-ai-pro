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
  PARSED_DATA: 'session_parsed_data',
  SHEET_META: 'session_sheet_meta',
  COLUMN_MAPPING: 'session_column_mapping',
};

export const DispatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Temporary session data com persistência em sessionStorage
  const [parsedData, setParsedDataInternal] = useState<ParsedData | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.PARSED_DATA);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [sheetMeta, setSheetMetaInternal] = useState<SheetMeta | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.SHEET_META);
    return saved ? JSON.parse(saved) : null;
  });
  
  const [columnMapping, setColumnMappingInternal] = useState<ColumnMapping | null>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEYS.COLUMN_MAPPING);
    return saved ? JSON.parse(saved) : null;
  });
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_CAMPAIGN_ID);
    return saved || null;
  });

  // Wrappers para persistir dados no sessionStorage
  const setParsedData = (data: ParsedData | null) => {
    if (data) {
      sessionStorage.setItem(STORAGE_KEYS.PARSED_DATA, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
    }
    setParsedDataInternal(data);
  };

  const setSheetMeta = (meta: SheetMeta | null) => {
    if (meta) {
      sessionStorage.setItem(STORAGE_KEYS.SHEET_META, JSON.stringify(meta));
    } else {
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

  const reset = () => {
    setParsedData(null);
    setSheetMeta(null);
    setColumnMapping(null);
    sessionStorage.removeItem(STORAGE_KEYS.PARSED_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.SHEET_META);
    sessionStorage.removeItem(STORAGE_KEYS.COLUMN_MAPPING);
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
