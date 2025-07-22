import { RegisterHandlers, EndpointMiddleware } from 'ts-typed-api';
import app, { authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { Prompt, promptModel } from '../../models/prompt';
import { promptAdjustmentService } from '../../services/prompt-adjustment-service';
import { z } from 'zod';
import { PromptApiDefinition, PromptResponse } from '../definitions/prompt';

function formatPromptForResponse(prompt: Prompt): PromptResponse {
    return {
        id: prompt.id!,
        name: prompt.name,
        prompt: prompt.prompt,
        json_schema_response: <Record<string, string>>prompt.json_schema_response,
        json_schema_input: <Record<string, string>>prompt.json_schema_input,
        current_version: prompt.current_version,
        versions: prompt.versions.map((v: any) => ({
            version: v.version,
            name: v.name,
            prompt: v.prompt,
            json_schema_response: v.json_schema_response,
            json_schema_input: v.json_schema_input,
            created_at: v.created_at instanceof Date ? v.created_at.toISOString() : v.created_at
        })),
        created_at: (prompt.created_at instanceof Date ? prompt.created_at.toISOString() : prompt.created_at)!,
        updated_at: (prompt.updated_at instanceof Date ? prompt.updated_at.toISOString() : prompt.updated_at)!
    };
}

RegisterHandlers(app, PromptApiDefinition, {
    prompts: {
        selectList: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error getting prompt select list:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve prompt select list'
                });
            }
        },

        list: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error listing prompts:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve prompts'
                });
            }
        },

        create: async (req, res) => {
            try {

                const existingPrompt = await promptModel.findByName(req.body.name);
                if (existingPrompt) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'A prompt with this name already exists'
                    });
                }

                const newPrompt = await promptModel.create(req.body);

                res.respond(201, formatPromptForResponse(newPrompt));
            } catch (error) {
                console.error('Error creating prompt:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                if (error instanceof Error && error.message.includes('Invalid JSON schema')) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: error.message
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create prompt'
                });
            }
        },

        getById: async (req, res) => {
            try {
                const { id } = req.params;

                const prompt = await promptModel.findById(id);
                if (!prompt) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Prompt not found'
                    });
                }

                res.respond(200, formatPromptForResponse(prompt));
            } catch (error) {
                console.error('Error getting prompt by ID:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve prompt'
                });
            }
        },

        update: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error updating prompt:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                if (error instanceof Error && error.message.includes('Invalid JSON schema')) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: error.message
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to update prompt'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;

                const deleted = await promptModel.delete(id);
                if (!deleted) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Prompt not found'
                    });
                }

                res.respond(204, {});
            } catch (error) {
                console.error('Error deleting prompt:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete prompt'
                });
            }
        },

        searchByName: async (req, res) => {
            try {
                const { pattern } = req.params;

                const prompts = await promptModel.searchByName(pattern);
                const formattedPrompts = prompts.map(formatPromptForResponse);

                res.respond(200, formattedPrompts);
            } catch (error) {
                console.error('Error searching prompts by name:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to search prompts'
                });
            }
        },

        getRecent: async (req, res) => {
            try {
                const { limit } = req.query;

                const prompts = await promptModel.getRecent(limit || 10);
                const formattedPrompts = prompts.map(formatPromptForResponse);

                res.respond(200, formattedPrompts);
            } catch (error) {
                console.error('Error getting recent prompts:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve recent prompts'
                });
            }
        },

        generateAdjustment: async (req, res) => {
            try {
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
            } catch (error) {
                console.error('Error generating adjustment prompt:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.errors
                    });
                }

                if (error instanceof Error) {
                    // Handle specific error cases
                    if (error.message.includes('not found')) {
                        return res.respond(404, {
                            error: 'Not Found',
                            message: error.message
                        });
                    }

                    if (error.message.includes('does not belong to prompt') ||
                        error.message.includes('has not completed successfully') ||
                        error.message.includes('has no result')) {
                        return res.respond(400, {
                            error: 'Validation Error',
                            message: error.message
                        });
                    }
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to generate adjustment prompt'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, authMiddleware])
