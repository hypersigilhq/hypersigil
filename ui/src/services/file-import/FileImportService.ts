import type { FileParser, ImportResult, ImportProgress } from './types'
import type { CreateTestDataItemRequest, BulkCreateTestDataItemsRequest } from '../definitions/test-data'
import { MarkdownParser } from './parsers/MarkdownParser'

export class FileImportService {
    private parsers: FileParser[] = []

    constructor() {
        this.registerDefaultParsers()
    }

    private registerDefaultParsers(): void {
        this.parsers.push(new MarkdownParser())
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
            status: 'pending'
        }))

        const progress: ImportProgress = {
            totalFiles: files.length,
            processedFiles: 0,
            successfulFiles: 0,
            failedFiles: 0,
            results
        }

        // Initial progress callback
        onProgress?.(progress)

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const result = results[i]

            try {
                result.status = 'processing'
                onProgress?.(progress)

                const parser = this.findParser(file)
                if (!parser) {
                    throw new Error(`No parser found for file type: ${file.name}`)
                }

                const items = await parser.parse(file)

                result.status = 'success'
                result.items = items
                progress.successfulFiles++
            } catch (error) {
                result.status = 'error'
                result.error = error instanceof Error ? error.message : 'Unknown error'
                progress.failedFiles++
            }

            progress.processedFiles++
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
