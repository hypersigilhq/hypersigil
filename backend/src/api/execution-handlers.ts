import { RegisterHandlers } from 'ts-typed-api';
import { ExecutionApiDefinition } from './execution-definitions';
import { executionService } from '../services/execution-service';
import { providerRegistry } from '../providers/provider-registry';
import { loggingMiddleware, timingMiddleware } from '../app';
import app from '../app';

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
                    updated_at: execution.updated_at!.toISOString()
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

                const response = {
                    ...result,
                    data: result.data.map(execution => ({
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
                        updated_at: execution.updated_at!.toISOString()
                    }))
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
                    updated_at: execution.updated_at!.toISOString()
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

        // GET /api/v1/executions/queue/status - Get queue processing status
        getQueueStatus: async (req, res) => {
            try {
                const queueStatus = executionService.getQueueStatus();
                res.respond(200, queueStatus);
            } catch (error) {
                console.error('Error getting queue status:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get queue status'
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
