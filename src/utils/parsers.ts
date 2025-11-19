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
    // Try to convert to export URL if it's a regular Google Sheets URL
    let exportUrl = url;
    
    if (url.includes('/edit')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        const sheetId = match[1];
        exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      }
    } else if (!url.includes('/export')) {
      throw new Error('URL inválida. Use o link de export CSV do Google Sheets.');
    }
    
    const response = await fetch(exportUrl);
    
    if (!response.ok) {
      throw new Error('Não foi possível baixar a planilha. Verifique se ela está pública.');
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
    throw new Error(error instanceof Error ? error.message : 'Erro ao processar URL');
  }
};
