import { RegisterHandlers } from 'ts-typed-api';
import app, { apiKeyMiddleware, authMiddleware, loggingMiddleware, timingMiddleware } from '../../app';
import { Deployment, deploymentModel, DeploymentOptions } from '../../models/deployment';
import { promptModel } from '../../models/prompt';
import { executionService } from '../../services/execution-service';
import { providerRegistry } from '../../providers/provider-registry';
import { z } from 'zod';
import { DeploymentApiDefinition, DeploymentResponse } from '../definitions/deployment';
import { ExecutionOptions } from '../../providers/base-provider';

function formatDeploymentForResponse(deployment: Deployment): DeploymentResponse {
    return {
        id: deployment.id!,
        name: deployment.name,
        promptId: deployment.promptId,
        provider: deployment.provider,
        model: deployment.model,
        options: deployment.options,
        created_at: (deployment.created_at instanceof Date ? deployment.created_at.toISOString() : deployment.created_at)!,
        updated_at: (deployment.updated_at instanceof Date ? deployment.updated_at.toISOString() : deployment.updated_at)!
    };
}

RegisterHandlers(app, DeploymentApiDefinition, {
    deployments: {
        list: async (req, res) => {
            try {
                const { page, limit, search, orderBy, orderDirection } = req.query;

                const result = await deploymentModel.findWithSearch({
                    page: page || 1,
                    limit: limit || 10,
                    search,
                    orderBy,
                    orderDirection
                });

                const formattedResult = {
                    ...result,
                    data: result.data.map(formatDeploymentForResponse)
                };

                res.respond(200, formattedResult);
            } catch (error) {
                console.error('Error listing deployments:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve deployments'
                });
            }
        },

        create: async (req, res) => {
            try {
                const { name, promptId, provider, model, options } = req.body;

                // Validate that prompt exists
                const prompt = await promptModel.findById(promptId);
                if (!prompt) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Prompt not found'
                    });
                }

                // Validate provider:model format and availability
                const providerModel = `${provider}:${model}`;
                try {
                    const { provider: parsedProvider, model: parsedModel } = providerRegistry.parseProviderModel(providerModel);
                    // This will throw if provider or model is invalid
                } catch (error) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: `Invalid provider:model combination: ${providerModel}`
                    });
                }

                const newDeployment = await deploymentModel.create({
                    name,
                    promptId,
                    provider,
                    model,
                    options: options as DeploymentOptions
                });

                res.respond(201, formatDeploymentForResponse(newDeployment));
            } catch (error) {
                console.error('Error creating deployment:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.issues
                    });
                }

                if (error instanceof Error && error.message.includes('already exists')) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: error.message
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to create deployment'
                });
            }
        },

        getById: async (req, res) => {
            try {
                const { id } = req.params;

                const deployment = await deploymentModel.findById(id);
                if (!deployment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                res.respond(200, formatDeploymentForResponse(deployment));
            } catch (error) {
                console.error('Error getting deployment by ID:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve deployment'
                });
            }
        },

        getByName: async (req, res) => {
            try {
                const { name } = req.params;

                const deployment = await deploymentModel.findByName(name);
                if (!deployment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                res.respond(200, formatDeploymentForResponse(deployment));
            } catch (error) {
                console.error('Error getting deployment by name:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve deployment'
                });
            }
        },

        update: async (req, res) => {
            try {
                const { id } = req.params;
                const updateData = req.body;

                const existingDeployment = await deploymentModel.findById(id);
                if (!existingDeployment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                // Validate prompt exists if promptId is being updated
                if (updateData.promptId) {
                    const prompt = await promptModel.findById(updateData.promptId);
                    if (!prompt) {
                        return res.respond(400, {
                            error: 'Validation Error',
                            message: 'Prompt not found'
                        });
                    }
                }

                // Validate provider:model format if provider or model is being updated
                if (updateData.provider || updateData.model) {
                    const provider = updateData.provider || existingDeployment.provider;
                    const model = updateData.model || existingDeployment.model;
                    const providerModel = `${provider}:${model}`;

                    try {
                        const { provider: parsedProvider, model: parsedModel } = providerRegistry.parseProviderModel(providerModel);
                        // This will throw if provider or model is invalid
                    } catch (error) {
                        return res.respond(400, {
                            error: 'Validation Error',
                            message: `Invalid provider:model combination: ${providerModel}`
                        });
                    }
                }

                const filteredUpdateData = Object.fromEntries(
                    Object.entries(updateData).filter(([_, value]) => value !== undefined)
                );

                const updatedDeployment = await deploymentModel.update(id, filteredUpdateData);
                if (!updatedDeployment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                res.respond(200, formatDeploymentForResponse(updatedDeployment));
            } catch (error) {
                console.error('Error updating deployment:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.issues
                    });
                }

                if (error instanceof Error && error.message.includes('already exists')) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: error.message
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to update deployment'
                });
            }
        },

        delete: async (req, res) => {
            try {
                const { id } = req.params;

                const deleted = await deploymentModel.delete(id);
                if (!deleted) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                res.respond(204, {});
            } catch (error) {
                console.error('Error deleting deployment:', error);
                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to delete deployment'
                });
            }
        },
        run: async (req, res) => {
            try {
                const { name } = req.params;
                const { userInput, traceId, fileId } = req.body;

                const deployment = await deploymentModel.findByName(name);
                if (!deployment) {
                    return res.respond(404, {
                        error: 'Not Found',
                        message: 'Deployment not found'
                    });
                }

                // Validate that prompt still exists
                const prompt = await promptModel.findById(deployment.promptId);
                if (!prompt) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Associated prompt not found'
                    });
                }

                // Create execution using the deployment's configuration
                const providerModel = `${deployment.provider}:${deployment.model}`;

                // Convert deployment options to execution options
                const executionOptions: ExecutionOptions | undefined = deployment.options ? {
                    ...(deployment.options.temperature !== undefined && { temperature: deployment.options.temperature }),
                    ...(deployment.options.topP !== undefined && { topP: deployment.options.topP }),
                    ...(deployment.options.topK !== undefined && { topK: deployment.options.topK })
                } : undefined;

                const result = await executionService.createExecution({
                    promptId: deployment.promptId,
                    userInput,
                    providerModel,
                    ...(executionOptions && { options: executionOptions }),
                    origin: req.isApiCall() ? 'api' : 'app',
                    traceId,
                    fileId
                });

                if (result.err) {
                    return res.respond(500, {
                        error: 'Internal server error',
                        message: 'Failed to create execution',
                        details: result.error
                    });
                }

                res.respond(201, { executionIds: [result.data.id!] });
            } catch (error) {
                console.error('Error running deployment by name:', error);

                if (error instanceof z.ZodError) {
                    return res.respond(400, {
                        error: 'Validation Error',
                        message: 'Invalid input data',
                        details: error.issues
                    });
                }

                res.respond(500, {
                    error: 'Internal Server Error',
                    message: 'Failed to run deployment'
                });
            }
        }
    }
}, [loggingMiddleware, timingMiddleware, apiKeyMiddleware<typeof DeploymentApiDefinition>((scopes, endpointInfo) => {
    if (endpointInfo.domain !== 'deployments') {
        return false;
    }
    switch (endpointInfo.routeKey) {
        case 'run':
            return scopes.includes('deployments:run');
        default:
            return false;
    }
}), authMiddleware]);
