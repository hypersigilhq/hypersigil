import type { FileParser, ImportResult, ImportProgress } from './types'
import type { CreateTestDataItemRequest, BulkCreateTestDataItemsRequest } from '../definitions/test-data'
import { MarkdownParser } from './parsers/MarkdownParser'
import { CsvParser } from './parsers/CsvParser'
import { JsonParser } from './parsers/JsonParser'

export class FileImportService {
    private parsers: FileParser[] = []

    constructor() {
        this.registerDefaultParsers()
    }

    private registerDefaultParsers(): void {
        this.parsers.push(new MarkdownParser())
        this.parsers.push(new CsvParser())
        this.parsers.push(new JsonParser())
    }

    registerParser(parser: FileParser): void {
        this.parsers.push(parser)
    }

    getSupportedFileTypes(): string {
        const extensions = this.parsers.flatMap(parser => parser.getSupportedExtensions())
        return extensions.join(',')
    }

    getParserDisplayNames(): string[] {
        return this.parsers.map(parser => parser.getDisplayName())
    }

    async processFiles(
        files: File[],
        onProgress?: (progress: ImportProgress) => void
    ): Promise<ImportProgress> {
        const results: ImportResult[] = files.map(file => ({
            fileName: file.name,
            status: 'pending' as const
        }))

        let progress: ImportProgress = {
            totalFiles: files.length,
            processedFiles: 0,
            successfulFiles: 0,
            failedFiles: 0,
            results: [...results]
        }

        // Initial progress callback
        onProgress?.(progress)

        for (let i = 0; i < files.length; i++) {
            const file = files[i]

            try {
                // Update status to processing
                results[i] = { ...results[i], status: 'processing' }
                progress = {
                    ...progress,
                    results: [...results]
                }
                onProgress?.(progress)

                const parser = this.findParser(file)
                if (!parser) {
                    throw new Error(`No parser found for file type: ${file.name}`)
                }

                const items = await parser.parse(file)

                // Update status to success
                results[i] = {
                    ...results[i],
                    status: 'success',
                    items
                }
                progress = {
                    ...progress,
                    processedFiles: progress.processedFiles + 1,
                    successfulFiles: progress.successfulFiles + 1,
                    results: [...results]
                }
            } catch (error) {
                // Update status to error
                results[i] = {
                    ...results[i],
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
                progress = {
                    ...progress,
                    processedFiles: progress.processedFiles + 1,
                    failedFiles: progress.failedFiles + 1,
                    results: [...results]
                }
            }

            onProgress?.(progress)
        }

        return progress
    }

    createBulkRequest(results: ImportResult[]): BulkCreateTestDataItemsRequest {
        const items: CreateTestDataItemRequest[] = []

        for (const result of results) {
            if (result.status === 'success' && result.items) {
                items.push(...result.items)
            }
        }

        return { items }
    }

    private findParser(file: File): FileParser | null {
        return this.parsers.find(parser => parser.canHandle(file)) || null
    }
}

// Export singleton instance
export const fileImportService = new FileImportService()
