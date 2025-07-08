import { promptModel } from '../models/prompt';
import { z } from 'zod';

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

export const promptHandlers = {
    // GET /api/v1/prompts - List prompts with pagination and search
    list: async (req: any, res: any) => {
        try {
            const { page, limit, search, orderBy, orderDirection } = req.query;

            const result = await promptModel.findWithSearch({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 10,
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
    create: async (req: any, res: any) => {
        try {
            const { name, prompt, json_schema_response } = req.body;

            // Check if prompt with same name already exists
            const existingPrompt = await promptModel.findByName(name);
            if (existingPrompt) {
                return res.respond(400, {
                    error: 'Validation Error',
                    message: 'A prompt with this name already exists'
                });
            }

            const newPrompt = await promptModel.create({
                name,
                prompt,
                json_schema_response
            });

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
    getById: async (req: any, res: any) => {
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
    update: async (req: any, res: any) => {
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

            const updatedPrompt = await promptModel.update(id, updateData);
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
    delete: async (req: any, res: any) => {
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
    searchByName: async (req: any, res: any) => {
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
    getRecent: async (req: any, res: any) => {
        try {
            const { limit } = req.query;

            const prompts = await promptModel.getRecent(parseInt(limit) || 10);
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
};
