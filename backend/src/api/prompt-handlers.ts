import { RegisterHandlers, EndpointMiddleware } from 'ts-typed-api';
import app from '../app';
import { Prompt, promptModel } from '../models/prompt';
import { z } from 'zod';
import { PromptApiDefinition } from '@prompt-bench/shared';

// Helper function to format prompt for API response
function formatPromptForResponse(prompt: any) {
    return {
        id: prompt.id,
        name: prompt.name,
        prompt: prompt.prompt,
        json_schema_response: prompt.json_schema_response,
        created_at: prompt.created_at instanceof Date ? prompt.created_at.toISOString() : prompt.created_at,
        updated_at: prompt.updated_at instanceof Date ? prompt.updated_at.toISOString() : prompt.updated_at
    };
}


// Custom middleware for ts-typed-api
const loggingMiddleware: EndpointMiddleware = (req, res, next, endpointInfo) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - Endpoint: ${endpointInfo.domain}.${endpointInfo.routeKey}`);
    next();
};

const timingMiddleware: EndpointMiddleware = (req, res, next, endpointInfo) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[TIMING] ${endpointInfo.domain}.${endpointInfo.routeKey} completed in ${duration}ms`);
    });

    next();
};

RegisterHandlers(app, PromptApiDefinition, {
    prompts: {
        // GET /api/v1/prompts - List prompts with pagination and search
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

        // POST /api/v1/prompts - Create a new prompt
        create: async (req, res) => {
            try {

                // Check if prompt with same name already exists
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

        // GET /api/v1/prompts/:id - Get a specific prompt
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

        // PUT /api/v1/prompts/:id - Update a specific prompt
        update: async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;

                // Check if prompt exists
                const existingPrompt = await promptModel.findById(id);
                if (!existingPrompt) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Prompt not found'
                    });
                }

                // Check if name is being updated and if it conflicts with another prompt
                if (updateData.name && updateData.name !== existingPrompt.name) {
                    const nameConflict = await promptModel.findByName(updateData.name);
                    if (nameConflict) {
                        return res.respond(400, {
                            error: 'Validation Error',
                            message: 'A prompt with this name already exists'
                        });
                    }
                }

                // Filter out undefined values to match the expected type
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

        // DELETE /api/v1/prompts/:id - Delete a specific prompt
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

        // GET /api/v1/prompts/search/:pattern - Search prompts by name pattern
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

        // GET /api/v1/prompts/recent - Get recent prompts
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
        }
    }
}, [loggingMiddleware, timingMiddleware])
