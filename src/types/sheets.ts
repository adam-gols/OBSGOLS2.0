/**
 * Type definitions for Google Sheets integration
 */

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  serviceAccountKey?: string;
  apiKey?: string;
  eventSheetName?: string;
  operationsSheetName?: string;
}

export interface SheetRange {
  sheetName: string;
  startRow?: number;
  endRow?: number;
  startColumn?: string;
  endColumn?: string;
}

export interface SheetData {
  range: string;
  values: any[][];
  rowCount: number;
  columnCount: number;
  lastUpdated: string;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | undefined;
  awayScore?: number | undefined;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  streamUrl?: string | undefined;
  notes?: string | undefined;
  lastUpdated: string;
}

export interface OperationData {
  id: string;
  timestamp: string;
  operation: string;
  eventId?: string | undefined;
  data: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string | undefined;
}

export interface SheetColumnMapping {
  [key: string]: number | string;
}

export interface EventSheetSchema {
  id: number;
  name: number;
  date: number;
  time: number;
  location: number;
  homeTeam: number;
  awayTeam: number;
  homeScore: number;
  awayScore: number;
  status: number;
  streamUrl: number;
  notes: number;
  lastUpdated: number;
}

export interface OperationsSheetSchema {
  id: number;
  timestamp: number;
  operation: number;
  eventId: number;
  data: number;
  status: number;
  errorMessage: number;
}

export interface SheetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingColumns: string[];
  extraColumns: string[];
}

export interface SheetUpdateOperation {
  type: 'update' | 'append' | 'delete';
  range?: string;
  values: any[][];
  sheetName: string;
}

export interface SheetBatchOperation {
  operations: SheetUpdateOperation[];
  spreadsheetId: string;
}
