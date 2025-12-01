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

export interface AIInstructions {
  identidade: string;
  objetivo: string;
  tom_estilo: string;
  cta: string;
  restricoes: string;
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  description: string;
  ai_instructions: AIInstructions;
  created_at: string;
  updated_at: string;
  status: 'active' | 'paused' | 'archived';
  stats: {
    total_uploads: number;
    total_contacts: number;
    total_batches: number;
    total_sent: number;
    total_scheduled: number;
  };
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  ai_instructions: AIInstructions;
  is_custom: boolean;
  created_at: string;
}

export interface BatchInfo {
  id: string;
  block_number: number;
  block_size: number;
  range: {
    start: number;
    end: number;
  };
  contacts: Contact[];
  status: 'ready' | 'sending' | 'sent' | 'error' | 'scheduled';
  scheduled_at?: string;
  created_at: string;
  campaign_id: string;
  sheet_meta?: SheetMeta;
  column_mapping?: ColumnMapping;
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
  campaign_id: string;
}

export interface WebhookPayload {
  source: string;
  campaign: {
    id: string;
    name: string;
    objective: string;
    ai_instructions: AIInstructions;
  };
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
