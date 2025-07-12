import type { FileParser } from '../types'
import type { CreateTestDataItemRequest } from '../../definitions/test-data'

export abstract class BaseParser implements FileParser {
    abstract canHandle(file: File): boolean
    abstract parse(file: File): Promise<CreateTestDataItemRequest[]>
    abstract getDisplayName(): string
    abstract getSupportedExtensions(): string[]

    protected readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
            reader.readAsText(file, 'utf-8')
        })
    }

    protected getFileNameWithoutExtension(fileName: string): string {
        const lastDotIndex = fileName.lastIndexOf('.')
        return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
    }

    protected validateFileSize(file: File, maxSizeInMB: number = 10): void {
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024
        if (file.size > maxSizeInBytes) {
            throw new Error(`File size exceeds ${maxSizeInMB}MB limit`)
        }
    }
}
