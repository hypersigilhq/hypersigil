import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { AIProviderName } from '../providers/base-provider';

export type SettingsMultipleTypeMap = {
    "llm-api-key": {
        document: LlmApiKeySettingsDocument;
        identifier: `${AIProviderName}`;
    };
    "token-limit": {
        document: TokenLimitSettingsDocument;
        identifier: `${AIProviderName}:${string}`;
    };
}

export interface LlmApiKeySettingsDocument extends SettingsDocument<"llm-api-key"> {
    provider: AIProviderName;
    api_key: string;
}

export interface TokenLimitSettingsDocument extends SettingsDocument<"token-limit"> {
    provider: AIProviderName;
    model: string;
    limit: number;
}

export type SettingsSingleTypeMap = {
    // Example future single settings:
    // "global-theme": {
    //     document: GlobalThemeSettingsDocument;
    // };
    // "system-config": {
    //     document: SystemConfigSettingsDocument;
    // };
}

/**
 * ## Usage Examples:

```typescript
// Multiple instances - requires identifier
const apiKey: LlmApiKeySettingsDocument = {
    type: "llm-api-key",
    identifier: "openai", // Required
    provider: "openai",
    api_key: "sk-...",
    name: "Production OpenAI Key"
}

// Single instance - no identifier needed
const themeConfig: GlobalThemeSettingsDocument = {
    type: "global-theme",
    // identifier: never - TypeScript prevents this
    darkMode: true,
    primaryColor: "#007bff"
}
```
 */

export type SettingsMultipleType = keyof SettingsMultipleTypeMap;
export type SettingsSingleType = keyof SettingsSingleTypeMap;

export type SettingsIdentifierMap = {
    [K in SettingsMultipleType]: SettingsMultipleTypeMap[K]['identifier'];
}

export type SettingsTypeMap = {
    [K in SettingsMultipleType]: SettingsMultipleTypeMap[K]['document'];
} & {
    [K in SettingsSingleType]: SettingsSingleTypeMap[K]['document'];
}

export interface SettingsDocument<T extends keyof SettingsTypeMap = keyof SettingsTypeMap> extends BaseDocument {
    type: T;
    identifier: T extends SettingsMultipleType ? SettingsIdentifierMap[T] : never;
}

export class SettingsModel extends Model<SettingsDocument> {
    protected tableName = 'settings';

    /**
     * Create a new setting with proper type safety
     */
    async createSetting<T extends keyof SettingsTypeMap>(
        type: T,
        data: Omit<SettingsTypeMap[T], 'id' | 'created_at' | 'updated_at' | 'type'>
    ): Promise<SettingsTypeMap[T]> {
        const settingData = {
            ...data,
            type
        } as Omit<SettingsTypeMap[T], 'id' | 'created_at' | 'updated_at'>;

        return this.create(settingData) as Promise<SettingsTypeMap[T]>;
    }

    /**
     * Update an existing setting with proper type safety
     */
    async updateSetting<T extends keyof SettingsTypeMap>(
        id: string,
        data: Partial<Omit<SettingsTypeMap[T], 'id' | 'created_at' | 'updated_at' | 'type'>>
    ): Promise<SettingsTypeMap[T] | null> {
        return this.update(id, data as Partial<Omit<SettingsDocument, 'id' | 'created_at'>>) as Promise<SettingsTypeMap[T] | null>;
    }

    /**
     * Get a setting by ID with proper type casting
     */
    async getSettingById<T extends keyof SettingsTypeMap>(id: string): Promise<SettingsTypeMap[T] | null> {
        return this.findById(id) as Promise<SettingsTypeMap[T] | null>;
    }

    /**
     * Get all settings of a specific type
     */
    async getSettingsByType<T extends keyof SettingsTypeMap>(type: T): Promise<SettingsTypeMap[T][]> {
        return this.findMany({
            where: { type },
            orderBy: 'created_at',
            orderDirection: 'DESC'
        }) as Promise<SettingsTypeMap[T][]>;
    }

    /**
     * Get single setting (enforces single category)
     */
    async getSingleSetting(type: SettingsSingleType): Promise<SettingsDocument | null> {
        return this.findOne({ type });
    }

    /**
     * Get setting by type and identifier (for multiple-type settings)
     */
    async getSettingByTypeAndIdentifier<T extends keyof SettingsTypeMap>(
        type: T,
        identifier: string
    ): Promise<SettingsTypeMap[T] | null> {
        return this.findOne({ type, identifier }) as Promise<SettingsTypeMap[T] | null>;
    }

    /**
     * Get setting by type and name (for multiple-type settings)
     */
    async getSettingByTypeAndName<T extends keyof SettingsTypeMap>(
        type: T,
        name: string
    ): Promise<SettingsTypeMap[T] | null> {
        return this.findOne({ type, name }) as Promise<SettingsTypeMap[T] | null>;
    }

    /**
     * Delete setting by ID
     */
    async deleteSetting(id: string): Promise<boolean> {
        return this.delete(id);
    }

    /**
     * Delete settings by type
     */
    async deleteSettingsByType(type: keyof SettingsTypeMap): Promise<number> {
        return this.deleteMany({ type });
    }

    /**
     * Delete setting by type and identifier
     */
    async deleteSettingByTypeAndIdentifier(type: keyof SettingsTypeMap, identifier: string): Promise<number> {
        return this.deleteMany({ type, identifier });
    }

    /**
     * Check if a setting exists by type and identifier
     */
    async settingExists(type: keyof SettingsTypeMap, identifier?: string): Promise<boolean> {
        const where: any = { type };
        if (identifier) {
            where.identifier = identifier;
        }

        const count = await this.count(where);
        return count > 0;
    }

    /**
     * Upsert setting - create if doesn't exist, update if it does
     * Useful for single-type settings or when you want to replace existing settings
     */
    async upsertSetting<T extends keyof SettingsTypeMap>(
        type: T,
        data: Omit<SettingsTypeMap[T], 'id' | 'created_at' | 'updated_at' | 'type'>,
        identifier?: string
    ): Promise<SettingsTypeMap[T]> {
        const where: any = { type };
        if (identifier) {
            where.identifier = identifier;
        }

        const existing = await this.findOne(where);

        if (existing) {
            const updated = await this.updateSetting(existing.id!, data);
            return updated as SettingsTypeMap[T];
        } else {
            return this.createSetting(type, data);
        }
    }

}

// Export singleton instance
export const settingsModel = new SettingsModel();
