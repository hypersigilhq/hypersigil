import { RegisterHandlers } from 'ts-typed-api';
import { executionService } from '../../services/execution-service';
import { providerRegistry } from '../../providers/provider-registry';
import { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import app from '../../app';
import { ExecutionOptions } from '../../providers/base-provider';
import { Prompt, promptModel, PromptVersion } from '../../models/prompt';
import { ExecutionApiDefinition, ExecutionResponse } from '../definitions/execution';
import { executionModel, fileModel } from '../../models';

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
                const { promptId, promptVersion, userInput, options, traceId, fileId } = req.body;

                // Validate fileId exists if provided
                if (fileId) {
                    const file = await fileModel.findById(fileId);
                    if (!file) {
                        res.respond(400, {
                            error: 'Validation error',
                            message: `File with id ${fileId} not found`
                        });
                        return;
                    }
                }

                for (let i in req.body.providerModel) {
                    let providerModel = req.body.providerModel[i]!

                    const result = await executionService.createExecution({
                        promptId,
                        ...(promptVersion !== undefined && { promptVersion }),
                        promptText,
                        userInput: userInput!,
                        providerModel,
                        options: options as ExecutionOptions,
                        origin: req.isApiCall() ? 'api' : 'app',
                        traceId,
                        fileId
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
        },

        list: async (req, res) => {
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
                        traceId: execution.trace_id,
                        fileId: execution.fileId
                    }
                })
            };

            res.respond(200, response);
        },

        getById: async (req, res) => {
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
                result_valid: execution.status === 'completed' ? execution.result_valid : false,
                result_validation_message: execution.result_validation_message,
                input_tokens_used: execution.input_tokens_used,
                output_tokens_used: execution.output_tokens_used,
                test_data_group_id: execution.test_data_group_id,
                test_data_item_id: execution.test_data_item_id,
                error_message: execution.error_message,
                started_at: execution.started_at?.toISOString(),
                completed_at: execution.completed_at?.toISOString(),
                created_at: execution.created_at!.toISOString(),
                updated_at: execution.updated_at!.toISOString(),
                options: execution.options,
                starred: execution.starred,
                origin: execution.origin,
                traceId: execution.trace_id,
                fileId: execution.fileId
            };

            res.respond(200, response);
        },

        cancel: async (req, res) => {
            const { id } = req.params;
            const cancelled = await executionService.cancelExecution(id);

            if (!cancelled) {
                return res.respond(404, {
                    error: 'Execution not found',
                    message: `Execution with id ${id} not found`
                });
            }

            res.respond(204, {});
        },

        getStats: async (req, res) => {
            const stats = await executionService.getExecutionStats();
            res.respond(200, stats);
        }
    },

    providers: {
        getProviderHealth: async (req, res) => {
            const health = await providerRegistry.getProviderHealth();
            res.respond(200, health);

        },

        listProviders: async (req, res) => {
            const providers = providerRegistry.getProviderNames();
            res.respond(200, providers);
        },

        getAvailableModels: async (req, res) => {
            const models = await providerRegistry.getAvailableModels(req.query.supportsFileUpload || false);
            res.respond(200, models);
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
