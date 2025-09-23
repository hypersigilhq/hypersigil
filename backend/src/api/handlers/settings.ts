import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { SettingsApiDefinition, SettingsDocument } from '../definitions/settings';
import { LlmApiKeySettingsDocument, settingsModel, SettingsDocument as SettingsModelDocument } from '../../models/settings';
import { encryptString } from '../../util/encryption';
import { providerRegistry } from '../../providers/provider-registry';
import { randomUUID } from 'crypto';

/**
 * Helper function to format settings document to API response format
 */
function formatSettingsDocument(setting: SettingsModelDocument): SettingsDocument {
    const baseDocument = {
        id: setting.id!,
        type: setting.type,
        created_at: setting.created_at!.toISOString(),
        updated_at: setting.updated_at!.toISOString()
    };

    switch (setting.type) {
        case 'llm-api-key': {
            const llmSetting = setting as any; // Type assertion needed due to union type complexity
            return {
                ...baseDocument,
                type: 'llm-api-key',
                identifier: llmSetting.provider,
                provider: llmSetting.provider,
                api_key: llmSetting.api_key,
                active: llmSetting.active
            };
        }

        case 'webhook-destination': {
            const webhookSetting = setting as any; // Type assertion needed due to union type complexity
            return {
                ...baseDocument,
                type: 'webhook-destination',
                identifier: webhookSetting.identifier,
                name: webhookSetting.name,
                url: webhookSetting.url,
                active: webhookSetting.active
            };
        }

        case 'service-api-key': {
            const serviceSetting = setting as any; // Type assertion needed due to union type complexity
            return {
                ...baseDocument,
                type: 'service-api-key',
                identifier: serviceSetting.identifier,
                provider: serviceSetting.provider,
                api_key: serviceSetting.api_key,
                active: serviceSetting.active
            };
        }

        default:
            // Fallback for unknown types - should not happen in practice
            return {
                ...baseDocument,
                identifier: setting.identifier
            } as SettingsDocument;
    }
}

function formatSettingsDocuments(settings: SettingsModelDocument[]): SettingsDocument[] {
    return settings.map(formatSettingsDocument);
}

RegisterHandlers(app, SettingsApiDefinition, {
    settings: {
        list: async (req, res) => {
            const settings = await settingsModel.findMany({
                orderBy: 'created_at',
                orderDirection: 'DESC'
            });

            const formattedSettings = formatSettingsDocuments(settings);
            res.respond(200, { settings: formattedSettings });
        },

        create: async (req, res) => {
            const { type, data } = req.body;

            // Check if setting already exists for multiple-type settings
            switch (type) {
                case 'llm-api-key':
                    const llmIdentifier = data.provider;
                    const llmExists = await settingsModel.settingExists(type, llmIdentifier);

                    if (llmExists) {
                        res.respond(409, {
                            error: 'Conflict',
                            message: `Setting of type '${type}' with identifier '${llmIdentifier}' already exists`
                        });
                        return;
                    }
                    break
                case 'webhook-destination':
                    const webhookIdentifier = data.name;
                    const webhookExists = await settingsModel.settingExists(type, webhookIdentifier);

                    if (webhookExists) {
                        res.respond(409, {
                            error: 'Conflict',
                            message: `Setting of type '${type}' with identifier '${webhookIdentifier}' already exists`
                        });
                        return;
                    }
                    break
                case 'service-api-key':
                    const serviceIdentifier = data.provider;
                    const serviceExists = await settingsModel.settingExists(type, serviceIdentifier);

                    if (serviceExists) {
                        res.respond(409, {
                            error: 'Conflict',
                            message: `Setting of type '${type}' with identifier '${serviceIdentifier}' already exists`
                        });
                        return;
                    }
                    break
            }

            // Create the setting
            let settingData: any;

            switch (type) {
                case 'webhook-destination':
                    settingData = {
                        ...data,
                        identifier: randomUUID()
                    };
                    break
                case 'llm-api-key':

                    let available = providerRegistry.isProviderAvailable(data.provider, data.api_key)

                    if (available.err) {
                        res.respond(500, {
                            error: "Error while checking availability of the provider",
                            message: available.error
                        })
                        return
                    }

                    if (!await available.data) {
                        res.respond(400, {
                            error: "Provider not available (perhaps API key is invalid)",
                        })
                        return
                    }

                    let encrypted = encryptString(data.api_key)

                    if (encrypted.err) {
                        res.respond(500, {
                            error: "Error while encrypting API key",
                            message: encrypted.error
                        })
                        return
                    }

                    settingData = {
                        identifier: data.provider,
                        provider: data.provider,
                        api_key: encrypted.data,
                        active: data.active ?? true
                    };
                    break
                case 'service-api-key':
                    const serviceEncrypted = encryptString(data.api_key)

                    if (serviceEncrypted.err) {
                        res.respond(500, {
                            error: "Error while encrypting API key",
                            message: serviceEncrypted.error
                        })
                        return
                    }

                    settingData = {
                        identifier: data.provider,
                        provider: data.provider,
                        api_key: serviceEncrypted.data,
                        active: data.active ?? true
                    };
                    break
                default:
                    settingData = data
                    break
            }

            const setting = await settingsModel.createSetting(type, settingData);

            switch (type) {
                case "llm-api-key":
                    await providerRegistry.refreshProvidersFromSettings()
                    break;
            }

            const formattedSetting = formatSettingsDocument(setting);
            res.respond(201, formattedSetting);
        },

        get: async (req, res) => {
            const { id } = req.params;
            const setting = await settingsModel.getSettingById(id);

            if (!setting) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'Setting not found'
                });
                return;
            }

            const formattedSetting = formatSettingsDocument(setting);
            res.respond(200, formattedSetting);
        },

        update: async (req, res) => {
            const { id } = req.params;
            const { type, data } = req.body;

            // First check if setting exists
            const existing = await settingsModel.getSettingById(id);

            if (!existing) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'Setting not found'
                });
                return;
            }

            // Verify type matches
            if (existing.type !== type) {
                res.respond(400, {
                    error: 'Bad Request',
                    message: 'Setting type mismatch'
                });
                return;
            }

            // Cast data to any to bypass TypeScript union type issues
            const updatedSetting = await settingsModel.updateSetting(id, data as any);

            if (!updatedSetting) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'Setting not found'
                });
                return;
            }

            // Handle provider registry updates for LLM API keys
            if (type === "llm-api-key") {
                const llmSetting = updatedSetting as LlmApiKeySettingsDocument; // Type assertion for LLM settings

                // Check if active state changed
                if (data.active !== undefined) {
                    if (data.active) {
                        // Activating - add provider to registry
                        await providerRegistry.addProviderFromSettings(llmSetting);
                    } else {
                        // Deactivating - remove provider from registry
                        providerRegistry.removeProviderByName(llmSetting.provider);
                    }
                }
            }

            const formattedSetting = formatSettingsDocument(updatedSetting);
            res.respond(200, formattedSetting);
        },

        delete: async (req, res) => {
            const { id } = req.params;

            const setting = await settingsModel.getSettingById(id);
            if (!setting) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'Setting not found'
                });
                return;
            }

            const deleted = await settingsModel.deleteSetting(id);

            switch (setting.type) {
                case "llm-api-key":
                    await providerRegistry.refreshProvidersFromSettings()
                    break;
            }

            res.respond(200, { success: true });
        },

        listByType: async (req, res) => {
            const { type } = req.params;
            const settings = await settingsModel.getSettingsByType(type);
            const formattedSettings = formatSettingsDocuments(settings);
            res.respond(200, { settings: formattedSettings, type });
        },

        getByTypeAndIdentifier: async (req, res) => {
            const { type, identifier } = req.params;
            const setting = await settingsModel.getSettingByTypeAndIdentifier(type, identifier);

            if (!setting) {
                res.respond(404, {
                    error: 'Not Found',
                    message: 'Setting not found'
                });
                return;
            }

            const formattedSetting = formatSettingsDocument(setting);
            res.respond(200, formattedSetting);

        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
