import { RegisterHandlers } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { SettingsApiDefinition, SettingsDocument } from '../definitions/settings';
import { settingsModel, SettingsDocument as SettingsModelDocument } from '../../models/settings';
import { encryptString } from '../../util/encryption';
import { providerRegistry } from '../../providers/provider-registry';

/**
 * Helper function to format settings document to API response format
 */
function formatSettingsDocument(setting: SettingsModelDocument): SettingsDocument {
    return {
        id: setting.id!,
        type: setting.type as any,
        identifier: setting.identifier,
        provider: (setting as any).provider,
        api_key: (setting as any).api_key,
        model: (setting as any).model,
        limit: (setting as any).limit,
        created_at: setting.created_at!.toISOString(),
        updated_at: setting.updated_at!.toISOString()
    } as SettingsDocument;
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
                    const identifier = data.provider;
                    const exists = await settingsModel.settingExists(type, identifier);

                    if (exists) {
                        res.respond(409, {
                            error: 'Conflict',
                            message: `Setting of type '${type}' with identifier '${identifier}' already exists`
                        });
                        return;
                    }
                    break
            }

            // Create the setting
            let settingData: any;

            switch (type) {
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
                        api_key: encrypted.data
                    };
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
