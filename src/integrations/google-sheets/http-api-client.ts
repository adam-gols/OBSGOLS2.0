/**
 * HTTP Google Sheets API Client
 * Communicates with the local Python service for Google Sheets operations
 */

import { Logger } from '../../utils/logger';

const logger = Logger.getInstance();

export interface EventData {
    name: string;
    ops_sheet_id: string;
    date: string;
    location: string;
    raw_data: Record<string, any>;
}

export interface StreamData {
    site_name: string;
    stream_name: string;
    stream_url?: string;
    location: string;
    is_active: boolean;
    raw_data: string[];
    row_number: number;
}

export interface OperationsData {
    site_info: Record<string, any>[];
    master_schedule: Record<string, any>[];
}

export interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
    message?: string;
}

export interface SheetRangeData {
    range: string;
    values: string[][];
    rowCount: number;
    columnCount: number;
}

export interface BatchReadResponse {
    valueRanges: SheetRangeData[];
}

export interface ValueRange {
    range: string;
    values: string[][];
}

export interface BatchWriteRequest {
    spreadsheetId: string;
    valueInputOption: string;
    data: ValueRange[];
}

export interface BatchWriteResponse {
    spreadsheetId: string;
    totalUpdatedCells: number;
    totalUpdatedColumns: number;
    totalUpdatedRows: number;
    totalUpdatedSheets: number;
}

export class HTTPGoogleSheetsClient {
    private baseUrl: string;
    private healthCheckInterval?: number | undefined;
    private isServiceHealthy: boolean = false;

    constructor(baseUrl: string = 'http://localhost:8081') {
        this.baseUrl = baseUrl;
        this.startHealthChecking();
    }

    /**
     * Start periodic health checking of the Python service
     */
    private startHealthChecking(): void {
        this.checkHealth();
        this.healthCheckInterval = window.setInterval(() => {
            this.checkHealth();
        }, 30000); // Check every 30 seconds
    }

    /**
     * Stop health checking
     */
    public stopHealthChecking(): void {
        if (this.healthCheckInterval !== undefined) {
            window.clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    }

    /**
     * Check if the Python service is healthy
     */
    private async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            this.isServiceHealthy = response.ok;
            
            if (!this.isServiceHealthy) {
                logger.warn('Python service health check failed', { module: 'HTTPSheetsClient' });
            }

            return this.isServiceHealthy;
        } catch (error) {
            this.isServiceHealthy = false;
            logger.error('Python service is not available', { 
                module: 'HTTPSheetsClient',
                data: { error: error instanceof Error ? error.message : String(error) }
            });
            return false;
        }
    }

    /**
     * Get the current health status
     */
    public isHealthy(): boolean {
        return this.isServiceHealthy;
    }

    /**
     * Make a request to the Python service
     */
    private async makeRequest<T>(
        endpoint: string, 
        options: RequestInit = {}
    ): Promise<ServiceResponse<T>> {
        if (!this.isServiceHealthy) {
            throw new Error('Python service is not available. Please ensure the service is running on ' + this.baseUrl);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                signal: AbortSignal.timeout(30000), // 30 second timeout
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            logger.error(`Request to ${endpoint} failed`, {
                module: 'HTTPSheetsClient',
                data: { error: error instanceof Error ? error.message : String(error) }
            });
            throw error;
        }
    }

    /**
     * Get the list of events from the File Cabinet
     */
    async getEvents(): Promise<EventData[]> {
        const response = await this.makeRequest<EventData[]>('/events');
        return response.data || [];
    }

    /**
     * Get stream/site information for a specific operations sheet
     */
    async getStreams(opsSheetId: string): Promise<StreamData[]> {
        const response = await this.makeRequest<StreamData[]>(`/streams/${opsSheetId}`);
        return response.data || [];
    }

    /**
     * Get operations data for a specific event
     */
    async getOperationsData(opsSheetId: string): Promise<OperationsData> {
        const response = await this.makeRequest<OperationsData>(`/operations/${opsSheetId}`);
        return response.data || { site_info: [], master_schedule: [] };
    }

    /**
     * Update the actual start time for a game
     */
    async updateActualStartTime(
        opsSheetId: string, 
        rowIndex: number, 
        startTime: string
    ): Promise<boolean> {
        const response = await this.makeRequest<void>(`/operations/${opsSheetId}/start-time`, {
            method: 'POST',
            body: JSON.stringify({
                row_index: rowIndex,
                start_time: startTime,
            }),
        });

        return response.success;
    }

    /**
     * Legacy compatibility methods
     * These methods provide compatibility with the existing Google Sheets client interface
     */

    /**
     * Read data from a spreadsheet range
     */
    async readRange(spreadsheetId: string, range: string): Promise<string[][]> {
        // For File Cabinet operations
        if (spreadsheetId === '1yIMVWLxVRwsTnUlRNuIKIhesgrL9rvTZheq7-U-zNM0') {
            const events = await this.getEvents();
            
            // Convert events to 2D array format
            if (events.length === 0) return [];
            
            const headers = ['Event Name', 'OPS SHEET ID', 'Date', 'Location'];
            const rows = [headers];
            
            events.forEach(event => {
                rows.push([
                    event.name,
                    event.ops_sheet_id,
                    event.date,
                    event.location
                ]);
            });
            
            return rows;
        }
        
        // For operations sheets, parse the range to determine what data to return
        const data = await this.getOperationsData(spreadsheetId);
        
        if (range.includes('Site Info') || range.includes('site_info')) {
            if (data.site_info.length === 0) return [];
            
            const firstItem = data.site_info[0];
            if (!firstItem) return [];
            
            const siteInfoHeaders = Object.keys(firstItem);
            const rows = [siteInfoHeaders];
            
            data.site_info.forEach(item => {
                rows.push(siteInfoHeaders.map(header => item[header] || ''));
            });
            
            return rows;
        }
        
        if (range.includes('Master Schedule') || range.includes('master_schedule')) {
            if (data.master_schedule.length === 0) return [];
            
            const firstItem = data.master_schedule[0];
            if (!firstItem) return [];
            
            const scheduleHeaders = Object.keys(firstItem);
            const rows = [scheduleHeaders];
            
            data.master_schedule.forEach(item => {
                rows.push(scheduleHeaders.map(header => item[header] || ''));
            });
            
            return rows;
        }
        
        // Default: return empty array
        return [];
    }

    /**
     * Batch read multiple ranges
     */
    async batchRead(spreadsheetId: string, ranges: string[]): Promise<BatchReadResponse> {
        const valueRanges: SheetRangeData[] = [];
        
        for (const range of ranges) {
            try {
                const values = await this.readRange(spreadsheetId, range);
                valueRanges.push({
                    range,
                    values,
                    rowCount: values.length,
                    columnCount: values.length > 0 ? (values[0]?.length || 0) : 0
                });
            } catch (error) {
                logger.error(`Failed to read range ${range}`, {
                    module: 'HTTPSheetsClient',
                    data: { error: error instanceof Error ? error.message : String(error) }
                });
                // Add empty range on error
                valueRanges.push({
                    range,
                    values: [],
                    rowCount: 0,
                    columnCount: 0
                });
            }
        }
        
        return { valueRanges };
    }

    /**
     * Write data to a spreadsheet range
     */
    async writeRange(
        spreadsheetId: string, 
        range: string, 
        values: string[][]
    ): Promise<void> {
        // For now, only support updating actual start time
        if (range.includes('Master Schedule') && values.length === 1) {
            const firstRow = values[0];
            if (firstRow && firstRow.length === 1) {
                // Extract row from range (assuming format like "Master Schedule!L2")
                const match = range.match(/!([A-Z]+)(\d+)/);
                if (match && match[2]) {
                    const rowNumber = parseInt(match[2]);
                    const rowIndex = rowNumber - 2; // Convert to 0-based index, accounting for header
                    const startTime = firstRow[0];
                    if (startTime) {
                        await this.updateActualStartTime(spreadsheetId, rowIndex, startTime);
                        return;
                    }
                }
            }
        }
        
        throw new Error('Write operations not supported for this range. Use updateActualStartTime for game start times.');
    }

    /**
     * Batch write multiple ranges
     */
    async batchWrite(request: BatchWriteRequest): Promise<BatchWriteResponse> {
        // For now, only support single range writes for actual start time
        if (request.valueInputOption && request.data && request.data.length === 1) {
            const writeData = request.data[0];
            if (writeData) {
                await this.writeRange(request.spreadsheetId, writeData.range, writeData.values);
                
                return {
                    spreadsheetId: request.spreadsheetId,
                    totalUpdatedCells: writeData.values.flat().length,
                    totalUpdatedColumns: writeData.values[0]?.length || 0,
                    totalUpdatedRows: writeData.values.length,
                    totalUpdatedSheets: 1
                };
            }
        }
        
        throw new Error('Batch write operations not fully supported. Use individual write operations.');
    }

    /**
     * Get the health status of the service
     */
    async getHealthStatus(): Promise<{ status: string; healthy: boolean }> {
        const healthy = await this.checkHealth();
        return {
            status: healthy ? 'healthy' : 'unhealthy',
            healthy
        };
    }
}

// Export a default instance
export const httpSheetsClient = new HTTPGoogleSheetsClient();
