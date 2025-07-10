import { RegisterHandlers } from 'ts-typed-api';
import { executionService } from '../../services/execution-service';
import { providerRegistry } from '../../providers/provider-registry';
import { loggingMiddleware, timingMiddleware } from '../../app';
import app from '../../app';
import { ExecutionOptions } from '../../providers/base-provider';
import { promptModel } from '../../models/prompt';
import { ExecutionApiDefinition, ExecutionResponse } from '../definitions/execution';
import { testDataGroupModel, testDataItemModel } from '../../models';

RegisterHandlers(app, ExecutionApiDefinition, {
    executions: {
        create: async (req, res) => {
            try {

                if (req.body.testDataGroupId) {
                    try {
                        const { promptId, promptVersion, testDataGroupId, providerModel, options } = req.body;

                        // Check if test data group exists
                        const group = await testDataGroupModel.findById(testDataGroupId);
                        if (!group) {
                            res.respond(404, {
                                error: 'Not found',
                                message: 'Test data group not found'
                            });
                            return;
                        }

                        // Get all items in the group
                        const items = await testDataItemModel.findByGroupId(testDataGroupId);
                        if (items.length === 0) {
                            res.respond(400, {
                                error: 'Validation error',
                                message: 'Test data group is empty'
                            });
                            return;
                        }

                        const executionIds: string[] = [];
                        const errors: { itemId: string; error: string }[] = [];

                        // Create executions for each item
                        for (const item of items) {
                            try {
                                const executionData: any = {
                                    promptId,
                                    userInput: item.content,
                                    providerModel
                                };

                                if (promptVersion !== undefined) {
                                    executionData.promptVersion = promptVersion;
                                }

                                if (options !== undefined) {
                                    executionData.options = options;
                                }

                                const execution = await executionService.createExecution(executionData);

                                executionIds.push(execution.id!);
                            } catch (error) {
                                errors.push({
                                    itemId: item.id!,
                                    error: error instanceof Error ? error.message : 'Unknown error'
                                });
                            }
                        }

                        res.respond(201, { executionIds });
                    } catch (error) {
                        console.error('Error creating batch executions:', error);
                        res.respond(500, {
                            error: 'Internal server error',
                            message: 'Failed to create batch executions'
                        });
                    }
                    return
                }

                const { promptId, promptVersion, userInput, providerModel, options } = req.body;

                const execution = await executionService.createExecution({
                    promptId,
                    ...(promptVersion !== undefined && { promptVersion }),
                    userInput: userInput!,
                    providerModel,
                    options: options as ExecutionOptions
                });

                res.respond(201, { executionIds: [execution.id!] });
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

                        let pv = prompt.versions.find((v: any) => v.version === execution.prompt_version)

                        return <ExecutionResponse>{
                            id: execution.id!,
                            prompt_id: execution.prompt_id,
                            prompt_version: execution.prompt_version,
                            user_input: execution.user_input,
                            provider: execution.provider,
                            model: execution.model,
                            test_data_group_id: execution.test_data_group_id,
                            test_data_item_id: execution.test_data_item_id,
                            status: execution.status,
                            result: execution.result,
                            error_message: execution.error_message,
                            started_at: execution.started_at?.toISOString(),
                            completed_at: execution.completed_at?.toISOString(),
                            created_at: execution.created_at!.toISOString(),
                            updated_at: execution.updated_at!.toISOString(),
                            options: execution.options,
                            prompt: prompt && {
                                name: pv.name!,
                                version: pv.version
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

                const prompt = await promptModel.findById(execution.prompt_id);

                let pv = prompt!.versions.find((v: any) => v.version === execution.prompt_version)
                const response = {
                    id: execution.id!,
                    prompt_id: execution.prompt_id,
                    prompt_version: execution.prompt_version,
                    prompt: prompt && {
                        name: pv!.name!,
                        version: pv!.version
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

        getQueueStatus: async (req, res) => {
            try {
                const processingStatus = await executionService.getProcessingStatus();

                const queueStatus = {
                    processing: processingStatus.running,
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
