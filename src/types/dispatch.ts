export interface Contact {
  name: string;
  email: string;
  phone: string;
  extras: Record<string, string>;
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ColumnMapping {
  name: string;
  email: string;
  phone: string;
  extras: string[];
}

export interface BatchInfo {
  block_number: number;
  block_size: number;
  range: {
    start: number;
    end: number;
  };
  contacts: Contact[];
  status: 'ready' | 'sending' | 'sent' | 'error';
}

export interface DispatchHistory {
  id: string;
  timestamp: string;
  block_number: number;
  contacts_count: number;
  status: 'success' | 'error';
  response_status?: number;
  error_message?: string;
}

export interface SheetMeta {
  origin: 'upload' | 'url';
  filename_or_url: string;
  total_rows: number;
}

export interface WebhookPayload {
  source: string;
  sheet_meta: SheetMeta;
  mapping: {
    name: string;
    email: string;
    phone: string;
    extras: string[];
  };
  batch: {
    block_number: number;
    block_size: number;
    range: {
      start: number;
      end: number;
    };
  };
  contacts: Contact[];
}
