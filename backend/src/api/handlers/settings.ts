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
            try {
                const settings = await settingsModel.findMany({
                    orderBy: 'created_at',
                    orderDirection: 'DESC'
                });

                const formattedSettings = formatSettingsDocuments(settings);
                res.respond(200, { settings: formattedSettings });
            } catch (error) {
                console.error('Error listing settings:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to list settings'
                });
            }
        },

        create: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error creating setting:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create setting'
                });
            }
        },

        get: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error getting setting:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to get setting'
                });
            }
        },

        update: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error updating setting:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to update setting'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;
                const deleted = await settingsModel.deleteSetting(id);

                if (!deleted) {
                    res.respond(404, {
                        error: 'Not Found',
                        message: 'Setting not found'
                    });
                    return;
                }

                res.respond(200, { success: true });
            } catch (error) {
                console.error('Error deleting setting:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete setting'
                });
            }
        },

        listByType: async (req, res) => {
            try {
                const { type } = req.params;
                const settings = await settingsModel.getSettingsByType(type);

                const formattedSettings = formatSettingsDocuments(settings);
                res.respond(200, { settings: formattedSettings, type });
            } catch (error) {
                console.error('Error listing settings by type:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to list settings by type'
                });
            }
        },

        getByTypeAndIdentifier: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error getting setting by type and identifier:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to get setting by type and identifier'
                });
            }
        },

        deleteByTypeAndIdentifier: async (req, res) => {
            try {
                const { type, identifier } = req.params;
                const deletedCount = await settingsModel.deleteSettingByTypeAndIdentifier(type, identifier);

                if (deletedCount === 0) {
                    res.respond(404, {
                        error: 'Not Found',
                        message: 'Setting not found'
                    });
                    return;
                }

                res.respond(200, { success: true, deletedCount });
            } catch (error) {
                console.error('Error deleting setting by type and identifier:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete setting by type and identifier'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware]);
