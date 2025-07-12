import type { CreateTestDataItemRequest } from '../definitions/test-data'

export interface ImportResult {
    fileName: string
    status: 'pending' | 'processing' | 'success' | 'error'
    items?: CreateTestDataItemRequest[]
    error?: string
    progress?: number
}

export interface FileParser {
    canHandle(file: File): boolean
    parse(file: File): Promise<CreateTestDataItemRequest[]>
    getDisplayName(): string
    getSupportedExtensions(): string[]
}

export interface ImportProgress {
    totalFiles: number
    processedFiles: number
    successfulFiles: number
    failedFiles: number
    results: ImportResult[]
}
