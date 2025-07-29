import { RegisterHandlers, EndpointMiddleware } from 'ts-typed-api';
import app, { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { Prompt, promptModel } from '../../models/prompt';
import { promptAdjustmentService } from '../../services/prompt-adjustment-service';
import { z } from 'zod';
import { PromptApiDefinition, PromptResponse } from '../definitions/prompt';
import { JSONSchema } from '../../providers/base-provider';
import { promptService } from '../../services/prompt-service';

function formatPromptForResponse(prompt: Prompt): PromptResponse {
    return {
        id: prompt.id!,
        name: prompt.name,
        prompt: prompt.prompt,
        json_schema_response: <Record<string, string>>prompt.json_schema_response,
        json_schema_input: <Record<string, string>>prompt.json_schema_input,
        current_version: prompt.current_version,
        options: prompt.options,
        versions: prompt.versions.map((v: any) => ({
            version: v.version,
            name: v.name,
            prompt: v.prompt,
            json_schema_response: v.json_schema_response,
            json_schema_input: v.json_schema_input,
            options: v.options,
            created_at: v.created_at instanceof Date ? v.created_at.toISOString() : v.created_at
        })),
        created_at: (prompt.created_at instanceof Date ? prompt.created_at.toISOString() : prompt.created_at)!,
        updated_at: (prompt.updated_at instanceof Date ? prompt.updated_at.toISOString() : prompt.updated_at)!
    };
}

RegisterHandlers(app, PromptApiDefinition, {
    prompts: {
        selectList: async (req, res) => {
            const prompts = await promptModel.findAll();
            const selectList = {
                items: prompts
                    .filter(prompt => prompt.id) // Filter out any prompts without id
                    .map(prompt => ({
                        id: prompt.id!,
                        name: prompt.name
                    }))
            };

            res.respond(200, selectList);
        },

        list: async (req, res) => {
            const { page, limit, search, orderBy, orderDirection } = req.query;

            const result = await promptModel.findWithSearch({
                page: page || 1,
                limit: limit || 10,
                search,
                orderBy,
                orderDirection
            });

            const formattedResult = {
                ...result,
                data: result.data.map(formatPromptForResponse)
            };

            res.respond(200, formattedResult);
        },

        create: async (req, res) => {

            const existingPrompt = await promptModel.findByName(req.body.name);
            if (existingPrompt) {
                return res.respond(400, {
                    error: 'Validation Error',
                    message: 'A prompt with this name already exists'
                });
            }

            const newPrompt = await promptModel.create(req.body);

            res.respond(201, formatPromptForResponse(newPrompt));
        },

        getById: async (req, res) => {
            const { id } = req.params;

            const prompt = await promptModel.findById(id);
            if (!prompt) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Prompt not found'
                });
            }

            res.respond(200, formatPromptForResponse(prompt));
        },

        update: async (req, res) => {
            const { id } = req.params;
            const updateData = req.body;

            const existingPrompt = await promptModel.findById(id);
            if (!existingPrompt) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Prompt not found'
                });
            }

            if (updateData.name && updateData.name !== existingPrompt.name) {
                const nameConflict = await promptModel.findByName(updateData.name);
                if (nameConflict) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'A prompt with this name already exists'
                    });
                }
            }

            const filteredUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(([_, value]) => value !== undefined)
            );

            const updatedPrompt = await promptModel.update(id, filteredUpdateData);
            if (!updatedPrompt) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Prompt not found'
                });
            }

            res.respond(200, formatPromptForResponse(updatedPrompt));
        },

        delete: async (req, res) => {
            const { id } = req.params;

            const deleted = await promptModel.delete(id);
            if (!deleted) {
                return res.respond(404, {
                    error: 'Not Found',
                    message: 'Prompt not found'
                });
            }

            res.respond(204, {});
        },

        searchByName: async (req, res) => {
            const { pattern } = req.params;

            const prompts = await promptModel.searchByName(pattern);
            const formattedPrompts = prompts.map(formatPromptForResponse);

            res.respond(200, formattedPrompts);
        },

        getRecent: async (req, res) => {
            const { limit } = req.query;

            const prompts = await promptModel.getRecent(limit || 10);
            const formattedPrompts = prompts.map(formatPromptForResponse);

            res.respond(200, formattedPrompts);
        },

        generateAdjustment: async (req, res) => {
            const { id } = req.params;
            const { commentIds, summarize } = req.body;

            // Validate input
            if (!commentIds || commentIds.length === 0) {
                return res.respond(400, {
                    error: 'Validation Error',
                    message: 'At least one comment ID must be provided'
                });
            }

            const result = await promptAdjustmentService.generateAdjustmentPrompt(commentIds, id, summarize);
            res.respond(200, result);
        },

        preview: async (req, res) => {
            const { promptId, version, promptText, userInput } = req.body;

            let promptToCompile = promptText!;
            let originalPrompt = promptText!;
            let jsonSchema: JSONSchema | undefined;

            if (promptId) {
                // Get prompt from database
                const prompt = await promptModel.findById(promptId);
                if (!prompt) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Prompt not found'
                    });
                }

                if (version) {
                    // Get specific version
                    const promptVersion = promptModel.getVersion(prompt, version);
                    if (!promptVersion) {
                        return res.respond(404, {
                            error: 'Not Found',
                            message: `Version ${version} not found for this prompt`
                        });
                    }
                    promptToCompile = promptVersion.prompt;
                    originalPrompt = promptVersion.prompt;
                    jsonSchema = <JSONSchema>promptVersion.json_schema_input
                } else {
                    // Use current version
                    promptToCompile = prompt.prompt;
                    originalPrompt = prompt.prompt;
                    jsonSchema = <JSONSchema>prompt.json_schema_input
                }
            }

            const compilationResult = promptService.compilePrompt(userInput, promptToCompile, jsonSchema);

            if (compilationResult.err) {
                return res.respond(400, {
                    error: 'Compilation Error',
                    message: compilationResult.error.error,
                    details: compilationResult.error.details
                });
            }

            res.respond(200, {
                compiledPrompt: compilationResult.data,
            });

        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof PromptApiDefinition>((scopes, endpointInfo) => {
    if (endpointInfo.domain !== 'prompts') {
        return false
    }
    return scopes.includes('prompts:preview') && endpointInfo.routeKey === 'preview'
        || scopes.includes('prompts:read') && endpointInfo.routeKey === 'getById'
}), authMiddleware])
