import { BaseParser } from './BaseParser'
import type { CreateTestDataItemRequest } from '../../definitions/test-data'

export class JsonParser extends BaseParser {
    canHandle(file: File): boolean {
        const extension = file.name.toLowerCase().split('.').pop()
        return extension === 'json' || extension === 'jsonl' || extension === 'ndjson'
    }

    async parse(file: File): Promise<CreateTestDataItemRequest[]> {
        this.validateFileSize(file, 10) // 10MB limit for JSON files

        try {
            const content = await this.readFileAsText(file)

            if (!content.trim()) {
                throw new Error('File is empty')
            }

            // Split content into lines and filter out empty lines
            const lines = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)

            if (lines.length === 0) {
                throw new Error('No valid JSON lines found in file')
            }

            const items: CreateTestDataItemRequest[] = []
            const errors: string[] = []

            // Process each line as a separate JSON object
            lines.forEach((line, index) => {
                try {
                    // Parse the JSON line
                    const jsonObject = JSON.parse(line)

                    // Generate a name for this item
                    const name = this.generateItemName(jsonObject, index + 1)

                    // Create the test data item with formatted JSON content
                    items.push({
                        name,
                        content: JSON.stringify(jsonObject, null, 2)
                    })
                } catch (parseError) {
                    const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                    errors.push(`Line ${index + 1}: ${errorMessage}`)
                }
            })

            // If we have some successful items but also errors, we'll return the successful ones
            // but include error information in the main error if no items were parsed
            if (items.length === 0) {
                if (errors.length > 0) {
                    throw new Error(`Failed to parse any JSON lines:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ''}`)
                } else {
                    throw new Error('No valid JSON objects found in file')
                }
            }

            // If we have partial success, we could log warnings but still return the successful items
            if (errors.length > 0) {
                console.warn(`JSON Parser: ${errors.length} lines failed to parse:`, errors)
            }

            return items
        } catch (error) {
            throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    getDisplayName(): string {
        return 'JSON Lines Files'
    }

    getSupportedExtensions(): string[] {
        return ['.json', '.jsonl', '.ndjson']
    }

    private generateItemName(jsonObject: any, lineNumber: number): string {
        return `JSON Line ${lineNumber}`
    }
}
