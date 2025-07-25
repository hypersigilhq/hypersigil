import { RegisterHandlers } from 'ts-typed-api';
import { executionService } from '../../services/execution-service';
import { providerRegistry } from '../../providers/provider-registry';
import { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import app from '../../app';
import { ExecutionOptions } from '../../providers/base-provider';
import { Prompt, promptModel, PromptVersion } from '../../models/prompt';
import { ExecutionApiDefinition, ExecutionResponse } from '../definitions/execution';
import { executionModel } from '../../models';

// Provider cache - simple in-memory cache with no TTL
let providerHealthCache: any = null;
let providerNamesCache: string[] | null = null;
let availableModelsCache: any = null;

// Cache invalidation function
export function clearProviderCache() {
    providerHealthCache = null;
    providerNamesCache = null;
    availableModelsCache = null;
}

RegisterHandlers(app, ExecutionApiDefinition, {
    executions: {
        create: async (req, res) => {
            const { promptId, promptVersion, testDataGroupId, options, promptText } = req.body;
            if (testDataGroupId) {
                if (!promptId) {
                    res.respond(400, {
                        error: 'Validation error',
                        message: 'promptId is required for batch executions'
                    });
                    return;
                }

                let result = await executionService.createExecutionBundle(
                    testDataGroupId,
                    req.body.providerModel,
                    promptId,
                    promptVersion,
                    options as ExecutionOptions
                );

                if (result.err) {
                    console.error('Error creating batch executions:', result.error);
                    res.respond(500, {
                        error: 'Internal server error',
                        message: 'Failed to create execution',
                        details: result.error
                    });
                    return;
                }
                res.respond(201, { executionIds: result.data });
            } else {
                for (let i in req.body.providerModel) {
                    let providerModel = req.body.providerModel[i]!
                    const { promptId, promptVersion, userInput, options, traceId } = req.body;

                    const result = await executionService.createExecution({
                        promptId,
                        ...(promptVersion !== undefined && { promptVersion }),
                        promptText,
                        userInput: userInput!,
                        providerModel,
                        options: options as ExecutionOptions,
                        origin: req.isApiCall() ? 'api' : 'app',
                        traceId
                    });

                    if (result.err) {
                        res.respond(500, {
                            error: 'Internal server error',
                            message: 'Failed to create execution',
                            details: result.error
                        });
                        return;
                    }

                    res.respond(201, { executionIds: [result.data.id!] });
                    return;

                }

            }

        },

        update: async (req, res) => {
            try {
                const { id } = req.params;
                // Use the model method to update user properties
                const updatedExecution = await executionModel.updateUserProperties(id, req.body);

                if (!updatedExecution) {
                    return res.respond(404, {
                        error: 'Execution not found',
                        message: `Execution with id ${id} not found`
                    });
                }

                res.respond(201, {});
            } catch (error) {
                console.error('Error updating execution:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to update execution'
                });
            }
        },

        list: async (req, res) => {
            try {
                const { page, limit, status, provider, promptId, orderBy, orderDirection, ids, starred, downloadCsv } = req.query;

                let limitP = limit
                if (downloadCsv) {
                    limitP = -1
                }

                const result = await executionService.getExecutions({
                    page,
                    limit: limitP,
                    ...(status && { status }),
                    ...(provider && { provider }),
                    ...(promptId && { promptId }),
                    ...(starred !== undefined && { starred }),
                    ...(ids && { ids }),
                    orderBy,
                    orderDirection
                });

                const promptIds = [...new Set(result.data.map(execution => execution.prompt_id))];
                const promptsMap = new Map();

                if (promptIds.length > 0) {
                    const prompts = await Promise.all(
                        promptIds.filter(id => id !== undefined).map(async (id) => {
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

                if (req.query.downloadCsv) {
                    // Generate CSV content
                    const csvHeaders = ['id', 'prompt_id', 'prompt_version', 'prompt_text', 'model', 'prompt_name', 'prompt_value', 'user_input', 'status', 'result_valid', 'result'];
                    const csvRows = result.data.map(execution => {
                        const prompt = promptsMap.get(execution.prompt_id);
                        const pv = <Prompt['versions'][0]>prompt?.versions.find((v: Prompt['versions'][0]) => v.version === execution.prompt_version);

                        return [
                            execution.id || '',
                            execution.prompt_id || '',
                            execution.prompt_version?.toString() || '',
                            execution.prompt_text || '',
                            execution.model || '',
                            pv?.name || '',
                            pv?.prompt.replace(/"/g, '""') || '',
                            execution.user_input.replace(/"/g, '""'),
                            execution.status || '',
                            execution.result_valid?.toString() || '',
                            (execution.result || '').replace(/"/g, '""') // Escape quotes in CSV
                        ];
                    });

                    // Create CSV content
                    const csvContent = [
                        csvHeaders.join(','),
                        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
                    ].join('\n');

                    // Set CSV headers
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="executions.csv"');

                    res.send(csvContent);
                    return;
                }

                const response = {
                    ...result,
                    data: result.data.map(execution => {

                        let prompt: Prompt | undefined = undefined
                        let pv: PromptVersion | undefined = undefined
                        if (execution.prompt_id) {
                            prompt = promptsMap.get(execution.prompt_id)
                            if (prompt) {
                                pv = prompt.versions.find((v: any) => v.version === execution.prompt_version)
                            }
                        }

                        return <ExecutionResponse>{
                            id: execution.id!,
                            prompt_id: execution.prompt_id,
                            prompt_version: execution.prompt_version,
                            prompt_text: execution.prompt_text,
                            user_input: execution.user_input,
                            provider: execution.provider,
                            model: execution.model,
                            test_data_group_id: execution.test_data_group_id,
                            test_data_item_id: execution.test_data_item_id,
                            input_tokens_used: execution.input_tokens_used,
                            output_tokens_used: execution.output_tokens_used,
                            status: execution.status,
                            result: execution.result,
                            error_message: execution.error_message,
                            started_at: execution.started_at?.toISOString(),
                            completed_at: execution.completed_at?.toISOString(),
                            created_at: execution.created_at!.toISOString(),
                            updated_at: execution.updated_at!.toISOString(),
                            options: execution.options,
                            prompt: prompt && pv && {
                                name: pv.name!,
                                version: pv.version
                            },
                            result_valid: execution.result_valid,
                            result_validation_message: execution.result_validation_message,
                            starred: execution.starred,
                            origin: execution.origin,
                            traceId: execution.trace_id
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

                let prompt: Prompt | null = null
                if (execution.prompt_id) {
                    prompt = await promptModel.findById(execution.prompt_id);
                }

                let pv = prompt!.versions.find((v: any) => v.version === execution.prompt_version)
                const response: ExecutionResponse = {
                    id: execution.id!,
                    prompt_id: execution.prompt_id,
                    prompt_version: execution.prompt_version,
                    prompt_text: execution.prompt_text,
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
                    options: execution.options,
                    starred: execution.starred,
                    origin: execution.origin,
                    traceId: execution.trace_id
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
        }
    },

    providers: {
        getProviderHealth: async (req, res) => {
            try {
                if (providerHealthCache === null) {
                    providerHealthCache = await providerRegistry.getProviderHealth();
                }
                res.respond(200, providerHealthCache);
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
                if (providerNamesCache === null) {
                    providerNamesCache = providerRegistry.getProviderNames();
                }
                res.respond(200, providerNamesCache);
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
                if (availableModelsCache === null) {
                    availableModelsCache = await providerRegistry.getAvailableModels();
                }
                res.respond(200, availableModelsCache);
            } catch (error) {
                console.error('Error getting available models:', error);
                res.respond(500, {
                    error: 'Internal server error',
                    message: 'Failed to get available models'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof ExecutionApiDefinition>((scopes, endpointInfo) => {
    if (endpointInfo.domain !== 'executions') {
        return false
    }
    switch (endpointInfo.routeKey) {
        case 'getById':
            return scopes.includes('executions:read')
        case 'create':
            return scopes.includes('executions:run')
        default:
            return false
    }
}), authMiddleware]);
