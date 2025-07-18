import { BaseParser } from './BaseParser'
import type { CreateTestDataItemRequest } from '../../definitions/test-data'
import Papa from 'papaparse'

export class CsvParser extends BaseParser {
    canHandle(file: File): boolean {
        const extension = file.name.toLowerCase().split('.').pop()
        return extension === 'csv'
    }

    async parse(file: File): Promise<CreateTestDataItemRequest[]> {
        this.validateFileSize(file, 10) // 10MB limit for CSV files

        try {
            const content = await this.readFileAsText(file)

            if (!content.trim()) {
                throw new Error('File is empty')
            }

            // Use Papa Parse to parse CSV content
            const parseResult = Papa.parse<string[]>(content, {
                header: false,
                skipEmptyLines: true,
                transform: (value: string) => value.trim()
            })

            if (parseResult.errors.length > 0) {
                const errorMessages = parseResult.errors.map((error: any) => error.message).join(', ')
                throw new Error(`CSV parsing errors: ${errorMessages}`)
            }

            const rows = parseResult.data

            if (rows.length === 0) {
                throw new Error('No data found in CSV file')
            }

            if (rows.length === 1) {
                throw new Error('CSV file contains only headers, no data rows found')
            }

            // First row is the header
            const headers = rows[0]
            const dataRows = rows.slice(1)

            // Convert each data row to a JSON object using headers as keys
            const items: CreateTestDataItemRequest[] = dataRows.map((row, index) => {
                const jsonObject: Record<string, string> = {}

                // Map each cell to its corresponding header
                headers.forEach((header, headerIndex) => {
                    const value = row[headerIndex] || '' // Use empty string if cell is undefined
                    jsonObject[header] = value
                })

                // Use row number as name if no meaningful identifier is found
                const name = this.generateRowName(jsonObject, index + 1)

                return {
                    name,
                    content: JSON.stringify(jsonObject, null, 2)
                }
            })

            return items
        } catch (error) {
            throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    getDisplayName(): string {
        return 'CSV Files'
    }

    getSupportedExtensions(): string[] {
        return ['.csv']
    }


    private generateRowName(jsonObject: Record<string, string>, rowNumber: number): string {
        // Try to find a meaningful name from common identifier fields
        const nameFields = ['name', 'title', 'id', 'identifier', 'key', 'label']

        for (const field of nameFields) {
            const value = jsonObject[field] || jsonObject[field.toLowerCase()] || jsonObject[field.toUpperCase()]
            if (value && value.trim()) {
                return value.trim()
            }
        }

        // If no meaningful name found, use the first non-empty value or row number
        const firstValue = Object.values(jsonObject).find(value => value && value.trim())
        if (firstValue && firstValue.trim()) {
            return `${firstValue.trim().substring(0, 50)}${firstValue.length > 50 ? '...' : ''}`
        }

        return `Row ${rowNumber}`
    }
}
