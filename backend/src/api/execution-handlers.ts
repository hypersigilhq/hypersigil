import { RegisterHandlers } from 'ts-typed-api';
import { executionService } from '../services/execution-service';
import { providerRegistry } from '../providers/provider-registry';
import { loggingMiddleware, timingMiddleware } from '../app';
import app from '../app';
import { ExecutionOptions } from '../providers/base-provider';
import { promptModel } from '../models/prompt';
import { ExecutionApiDefinition } from './definitions/execution';

// Register execution API handlers
RegisterHandlers(app, ExecutionApiDefinition, {
    executions: {
        // POST /api/v1/executions - Create a new execution
        create: async (req, res) => {
            try {
                const { promptId, userInput, providerModel, options } = req.body;

                const execution = await executionService.createExecution({
                    promptId,
                    userInput,
                    providerModel,
                    options: options as ExecutionOptions
                });

                const response = {
                    id: execution.id!,
                    prompt_id: execution.prompt_id,
                    user_input: execution.user_input,
                    provider: execution.provider,
                    model: execution.model,
                    status: execution.status,
                    result: execution.result,
                    error_message: execution.error_message,
                    started_at: execution.started_at?.toISOString(),
                    completed_at: execution.completed_at?.toISOString(),
                    created_at: execution.created_at!.toISOString(),
                    updated_at: execution.updated_at!.toISOString(),
                    options: execution.options
                };

                res.respond(201, response);
            } catch (error) {
                console.error('Error creating execution:', error);

                if (error instanceof Error) {
                    if (error.message.includes('not found') || error.message.includes('not supported')) {
                        return res.respond(404, {
                            error: 'Resource not found',
                            message: error.message
                        });
                    }

                    if (error.message.includes('Invalid') || error.message.includes('format')) {
                        return res.respond(400, {
                            error: 'Invalid request',
                            message: error.message
                        });
                    }
                }

                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to create execution'
                });
            }
        },

        // GET /api/v1/executions - List executions with pagination and filtering
        list: async (req, res) => {
            try {
                const { page, limit, status, provider, promptId, orderBy, orderDirection } = req.query;

                const result = await executionService.getExecutions({
                    page,
                    limit,
                    ...(status && { status }),
                    ...(provider && { provider }),
                    ...(promptId && { promptId }),
                    orderBy,
                    orderDirection
                });

                // Batch fetch prompts for all executions
                const promptIds = [...new Set(result.data.map(execution => execution.prompt_id))];
                const promptsMap = new Map();

                if (promptIds.length > 0) {
                    const prompts = await Promise.all(
                        promptIds.map(async (id) => {
                            const prompt = await promptModel.findById(id);
                            return prompt ? { ...prompt, id } : null;
                        })
                    );

                    prompts.forEach(prompt => {
                        if (prompt) {
                            promptsMap.set(prompt.id, prompt);
                        }
                    });
                }

                const response = {
                    ...result,
                    data: result.data.map(execution => {

                        let prompt = promptsMap.get(execution.prompt_id)

                        return {
                            id: execution.id!,
                            prompt_id: execution.prompt_id,
                            user_input: execution.user_input,
                            provider: execution.provider,
                            model: execution.model,
                            status: execution.status,
                            result: execution.result,
                            error_message: execution.error_message,
                            started_at: execution.started_at?.toISOString(),
                            completed_at: execution.completed_at?.toISOString(),
                            created_at: execution.created_at!.toISOString(),
                            updated_at: execution.updated_at!.toISOString(),
                            options: execution.options,
                            prompt: {
                                id: prompt.id!,
                                name: prompt.name!,
                                prompt: prompt.prompt!,
                                json_schema_response: { ...prompt.json_schema_response },
                                created_at: prompt.created_at!.toISOString()!,
                                updated_at: prompt.updated_at!.toISOString()!
                            }
                        }
                    })
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error listing executions:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to list executions'
                });
            }
        },

        // GET /api/v1/executions/:id - Get a specific execution
        getById: async (req, res) => {
            try {
                const { id } = req.params;
                const execution = await executionService.getExecution(id);

                if (!execution) {
                    return res.respond(404, {
                        error: 'Execution not found',
                        message: `Execution with id ${id} not found`
                    });
                }

                // Fetch the associated prompt
                const prompt = await promptModel.findById(execution.prompt_id);

                const response = {
                    id: execution.id!,
                    prompt_id: execution.prompt_id,
                    prompt: prompt && {
                        id: prompt.id!,
                        name: prompt.name!,
                        prompt: prompt.prompt!,
                        json_schema_response: { ...prompt.json_schema_response },
                        created_at: prompt.created_at!.toISOString()!,
                        updated_at: prompt.updated_at!.toISOString()!
                    } || undefined,
                    user_input: execution.user_input,
                    provider: execution.provider,
                    model: execution.model,
                    status: execution.status,
                    result: execution.result,
                    error_message: execution.error_message,
                    started_at: execution.started_at?.toISOString(),
                    completed_at: execution.completed_at?.toISOString(),
                    created_at: execution.created_at!.toISOString(),
                    updated_at: execution.updated_at!.toISOString(),
                    options: execution.options
                };

                res.respond(200, response);
            } catch (error) {
                console.error('Error getting execution:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get execution'
                });
            }
        },

        // DELETE /api/v1/executions/:id - Cancel a pending execution
        cancel: async (req, res) => {
            try {
                const { id } = req.params;
                const cancelled = await executionService.cancelExecution(id);

                if (!cancelled) {
                    return res.respond(404, {
                        error: 'Execution not found',
                        message: `Execution with id ${id} not found`
                    });
                }

                res.respond(204, {});
            } catch (error) {
                console.error('Error cancelling execution:', error);

                if (error instanceof Error && error.message.includes('Cannot cancel')) {
                    return res.respond(400, {
                        error: 'Cannot cancel execution',
                        message: error.message
                    });
                }

                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to cancel execution'
                });
            }
        },

        // GET /api/v1/executions/stats - Get execution statistics
        getStats: async (req, res) => {
            try {
                const stats = await executionService.getExecutionStats();
                res.respond(200, stats);
            } catch (error) {
                console.error('Error getting execution stats:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get execution statistics'
                });
            }
        },

        // GET /api/v1/executions/queue/status - Get processing status
        getQueueStatus: async (req, res) => {
            try {
                const processingStatus = await executionService.getProcessingStatus();

                // Adapt the response to match the expected API format
                const queueStatus = {
                    processing: processingStatus.running,
                    queuedIds: [] // No longer tracking individual IDs since we use database polling
                };

                res.respond(200, queueStatus);
            } catch (error) {
                console.error('Error getting processing status:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get processing status'
                });
            }
        }
    },

    providers: {
        // GET /api/v1/executions/providers/health - Get provider health status
        getProviderHealth: async (req, res) => {
            try {
                const health = await providerRegistry.getProviderHealth();
                res.respond(200, health);
            } catch (error) {
                console.error('Error getting provider health:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get provider health'
                });
            }
        },

        // GET /api/v1/executions/providers - List available providers
        listProviders: async (req, res) => {
            try {
                const providers = providerRegistry.getProviderNames();
                res.respond(200, providers);
            } catch (error) {
                console.error('Error listing providers:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to list providers'
                });
            }
        },

        // GET /api/v1/executions/providers/models - Get available models for all providers
        getAvailableModels: async (req, res) => {
            try {
                const models = await providerRegistry.getAvailableModels();
                res.respond(200, models);
            } catch (error) {
                console.error('Error getting available models:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get available models'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware]);
