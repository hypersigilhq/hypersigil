import { BaseParser } from './BaseParser'
import type { CreateTestDataItemRequest } from '../../definitions/test-data'

export class MarkdownParser extends BaseParser {
    canHandle(file: File): boolean {
        const extension = file.name.toLowerCase().split('.').pop()
        return extension === 'md' || extension === 'markdown'
    }

    async parse(file: File): Promise<CreateTestDataItemRequest[]> {
        this.validateFileSize(file, 5) // 5MB limit for markdown files

        try {
            const content = await this.readFileAsText(file)

            if (!content.trim()) {
                throw new Error('File is empty')
            }

            const name = this.getFileNameWithoutExtension(file.name)

            return [{
                name: name || undefined,
                content: content.trim()
            }]
        } catch (error) {
            throw new Error(`Failed to parse markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    getDisplayName(): string {
        return 'Markdown Files'
    }

    getSupportedExtensions(): string[] {
        return ['.md', '.markdown']
    }
}
