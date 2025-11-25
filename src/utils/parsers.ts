import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedData } from '@/types/dispatch';

export const parseCSV = (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('Erro ao processar CSV: ' + results.errors[0].message));
          return;
        }
        
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        
        resolve({ headers, rows });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseXLSX = (file: File): Promise<ParsedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];
        
        if (jsonData.length === 0) {
          reject(new Error('Planilha vazia'));
          return;
        }
        
        const headers = jsonData[0].map(h => String(h).trim());
        const rows = jsonData.slice(1)
          .filter(row => row.some(cell => cell !== undefined && cell !== ''))
          .map(row => {
            const obj: Record<string, string> = {};
            headers.forEach((header, index) => {
              obj[header] = String(row[index] || '').trim();
            });
            return obj;
          });
        
        resolve({ headers, rows });
      } catch (error) {
        reject(new Error('Erro ao processar arquivo Excel'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const parseGoogleSheetsURL = async (url: string): Promise<ParsedData> => {
  try {
    let exportUrl = url.trim();
    
    // Extrair ID da planilha de qualquer formato de URL do Google Sheets
    const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    
    if (sheetIdMatch) {
      const sheetId = sheetIdMatch[1];
      exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    } else if (!url.includes('export?format=csv')) {
      throw new Error('URL inválida. Cole o link de compartilhamento da planilha do Google Sheets.');
    }
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error('Planilha não está pública. Vá em "Compartilhar" → "Qualquer pessoa com o link" → "Leitor"');
      }
      throw new Error(`Erro ao acessar planilha (código ${response.status}). Verifique se a planilha está pública.`);
    }
    
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('Erro ao processar CSV: ' + results.errors[0].message));
            return;
          }
          
          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];
          
          resolve({ headers, rows });
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Não foi possível acessar a planilha. Verifique se a URL está correta e se a planilha está configurada como pública.');
    }
    throw new Error(error instanceof Error ? error.message : 'Erro ao processar URL');
  }
};
